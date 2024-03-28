import got from 'got';
import logger from './logger';
import SharedLib from 'shared-lib';
import * as configAccessor from './config-accessor';
import HandledError from './handled-error';
import {
  DatabaseService,
  EmailService,
  OptimizationComputeService,
} from './service-types';

const START_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-start`;
const PAUSE_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-pause`;
const QUERY_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-query`;

export default class OptimizationComputeLocal
  implements OptimizationComputeService
{
  databaseCalls: DatabaseService;
  emailService: EmailService;
  configParams: Record<string, any>;

  constructor(
    databaseCalls: DatabaseService,
    emailService: EmailService,
    configParams: Record<string, any>
  ) {
    this.databaseCalls = databaseCalls;
    this.emailService = emailService;
    this.configParams = configParams;
  }

  // TODO: we should add retry here, it fails sometimes with a 500 because of Google reasons
  async start(
    accountId: string,
    optimizationId: string,
    stats?: unknown,
    options?: Record<string, any>
  ) {
    options = options ?? {};
    // Add additional flags to json body
    options['-n'] = optimizationId; // name
    options['-u'] = configAccessor.getUpdateUrl(); // update url
    options['-b'] = {
      optimizationId: optimizationId,
      accountId: accountId,
      apiKey: this?.configParams?.apiKey,
    };
    options['data'] = stats;
    options['PASSWORD'] = this.configParams.password;

    try {
      // Begin the optimizer and wait for to finish
      const response = await got.post(START_URL, {
        json: options,
      });
      if (response.statusCode === 200) {
        const jsonResponse = JSON.parse(response.body);
        if (jsonResponse.status === 'WARNING') {
          logger.warn(
            accountId,
            'Start Optimization Warning:',
            jsonResponse.message
          );
          return false;
        } else if (jsonResponse.status === 'SUCCESS') {
          return true;
        }
      }
    } catch (error) {
      logger.error(accountId, 'Error starting optimization', error);
      let errorMessage = error?.response?.body;
      try {
        errorMessage = errorMessage
          ? JSON.parse(errorMessage)?.message
          : 'Unknown Problem';
        throw new HandledError(
          accountId,
          error?.response?.code,
          errorMessage,
          error.stack
        );
      } catch (error2) {
        // Not a json error object for some reason
        throw new HandledError(
          accountId,
          error?.response?.statusCode,
          errorMessage,
          error.stack + ' - ' + error2.stack
        );
      }
    }

    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    );
  }

  async pause(accountId: string, optimizationId: string) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Pausing gcp optimization');

    // Begin the estimate and wait for to finish
    const response = await got.post(PAUSE_URL, {
      json: { i: optimizationId, PASSWORD: this.configParams.password },
    });

    if (response.statusCode === 200) {
      const jsonResponse = JSON.parse(response.body);
      if (jsonResponse.status === 'SUCCESS') {
        // Set optimization to pause, don't change the status (TODO: rename the status change function)
        const PAUSEABLE_STATUSES = SharedLib.constants.invertOptStatusSet(
          SharedLib.constants.TERMINAL_OPTIMIZATION_STATUSES_ENUM
        );
        await this.databaseCalls.setOptimizationStatus(
          accountId,
          optimizationId,
          null,
          null,
          true,
          // Don't set pause to true for an optimization in a terminal state
          PAUSEABLE_STATUSES
        );
        return response.body;
      } else {
        throw new HandledError(
          accountId,
          response?.statusCode,
          'Unexpected error encountered during pausing',
          response.body
        );
      }
    }
  }

  async query(accountId: string, optimizationId: string) {
    try {
      logger.log(accountId, 'Querying gcp bucket for result');
      // Begin the estimate and wait for to finish
      const queryResponse = await got.post(QUERY_URL, {
        json: { n: optimizationId, PASSWORD: this.configParams.password },
      });

      if (queryResponse.statusCode === 200) {
        const jsonResponse = JSON.parse(queryResponse.body);
        if (jsonResponse.status === 'SUCCESS') {
          if (JSON.parse(jsonResponse.message).status === undefined) {
            logger.warn(accountId, 'Result does not contain status');
            return null;
          }
          return jsonResponse.message;
        } else {
          throw new HandledError(
            accountId,
            queryResponse?.statusCode,
            'Unsuccessful query',
            queryResponse.body
          );
        }
      }
    } catch (error) {
      let errorMessage = error?.response?.body;
      try {
        errorMessage = errorMessage
          ? JSON.parse(errorMessage)?.message
          : 'Unknown Problem';
        logger.warn(
          accountId,
          'No result available for ',
          optimizationId,
          error.message,
          errorMessage
        );
      } catch (error) {
        // Not a json error object for some reason
        logger.warn(
          accountId,
          'No result available for, malformed response received ',
          optimizationId,
          error.message
        );
      }
    }
    return null;
  }

  async estimate(accountId: string, optimizationId: string, stats, options) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting gcp optimization estimate');

    // Add additional flags to json body
    options['-n'] = optimizationId;
    options['-e'] = true;
    options['data'] = stats;
    options['PASSWORD'] = this.configParams.password;

    // Begin the estimate and wait for it to finish
    try {
      const startResponse = await got.post(START_URL, {
        json: options,
      });
      logger.log(
        accountId,
        'Estimation Response',
        startResponse.statusCode,
        startResponse.body,
        options['-o']
      );

      const body = JSON.parse(startResponse.body);

      // A bit messy but we'll half the estimate since it came from a compute with half the CPU cores
      // Only for MONTE_CARLO_EXHAUSTIVE and MONTE_CARLO_ADAPTIVE since MONTE_CARLO_ANNEALING is fixed time
      if (
        parseInt(options['-o']) ===
          SharedLib.constants.OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_EXHAUSTIVE ||
        parseInt(options['-o']) ===
          SharedLib.constants.OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_ADAPTIVE
      ) {
        if (startResponse.body) {
          body.estimatedTimeRemainingMs = body.estimatedTimeRemainingMs / 2;
        }
      }

      return JSON.stringify(body);
    } catch (error) {
      let errorMessage = error?.response?.body;
      try {
        errorMessage = errorMessage
          ? JSON.parse(errorMessage)?.message
          : 'Unknown Problem';
        throw new HandledError(
          accountId,
          error?.response?.code,
          errorMessage,
          error.stack
        );
      } catch (error2) {
        // Not a json error object for some reason
        throw new HandledError(
          accountId,
          error?.response?.statusCode,
          errorMessage,
          error.stack + ' - ' + error2.stack
        );
      }
    }
  }
}
