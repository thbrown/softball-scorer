const got = require('got');

const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;

//var https = require('https');

const START_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-start`;
const PAUSE_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-pause`;
const QUERY_URL = `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-query`;

module.exports = class OptimizationComputeLocal {
  constructor(databaseCalls, emailService, configParams) {
    this.databaseCalls = databaseCalls;
    this.emailService = emailService;
    this.configParams = configParams;
  }

  async start(accountId, optimizationId, stats, options) {
    // Add additional flags to json body
    options['-i'] = optimizationId;
    options['data'] = stats;
    options['PASSWORD'] = this.configParams.password;

    try {
      // Begin the optimizer and wait for to finish
      let response = await got.post(START_URL, {
        json: options,
      });
      if (response.statusCode === 200) {
        let jsonResponse = JSON.parse(response.body);
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
      let errorMessage = error?.response?.body;
      try {
        errorMessage = errorMessage
          ? JSON.parse(errorMessage)?.message
          : 'Unknown Problem';
        throw new Error(errorMessage);
      } catch (error) {
        // Not a json error object for some reason
        throw new Error(errorMessage);
      }
    }

    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    );
  }

  async pause(accountId, optimizationId) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Pausing gcp optimization');

    // Begin the estimate and wait for to finish
    const response = await got.post(PAUSE_URL, {
      json: { i: optimizationId, PASSWORD: this.configParams.password },
    });

    if (response.statusCode === 200) {
      let jsonResponse = JSON.parse(response.body);
      if (jsonResponse.status === 'SUCCESS') {
        // Set optimization status to PAUSING
        await this.databaseCalls.setOptimizationStatus(
          accountId,
          optimizationId,
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING
        );
        return response.body;
      } else {
        logger.error(accountId, 'Error while pausing', response.body);
        throw new Error('Unexpected error encountered during pausing');
      }
    }
  }

  async query(accountId, optimizationId) {
    try {
      logger.log(accountId, 'Querying gcp bucket for result');
      // Begin the estimate and wait for to finish
      const queryResponse = await got.post(QUERY_URL, {
        json: { i: optimizationId, PASSWORD: this.configParams.password },
      });

      if (queryResponse.statusCode === 200) {
        let jsonResponse = JSON.parse(queryResponse.body);
        if (jsonResponse.status === 'SUCCESS') {
          if (JSON.parse(jsonResponse.message).status === undefined) {
            logger.warn(accountId, 'Result does not contain status', toReturn);
            return null;
          }
          return jsonResponse.message;
        } else {
          logger.error(accountId, 'Unsuccessful query', queryResponse.body);
          throw new Error('Unsuccessful query');
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

  async estimate(accountId, optimizationId, stats, options) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting gcp optimization estimate');

    // Add additional flags to json body
    options['-i'] = optimizationId;
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
        options['-o'],
        SharedLib.constants.OPTIMIZATION_TYPE_ENUM.MONTE_CARLO_EXHAUSTIVE
      );

      let body = JSON.parse(startResponse.body);

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
        throw new Error(errorMessage);
      } catch (error) {
        // Not a json error object for some reason
        throw new Error(errorMessage);
      }
    }
  }
};
