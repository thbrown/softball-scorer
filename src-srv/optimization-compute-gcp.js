const got = require('got');

const logger = require('./logger.js');
const SharedLib = require('../shared-lib').default;

//var https = require('https');

const ROOT = __dirname + '/optimizations-temp';
const STATS_PATH = ROOT + '/stats';
const RESULTS_PATH = ROOT + '/results';
const CTRL_FLAGS = ROOT + '/ctrl';

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
      await got.post(
        `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-start`,
        {
          json: options,
        }
      );
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
    const queryResponse = await got.post(
      `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-pause`,
      {
        json: { i: optimizationId, PASSWORD: this.configParams.password },
      }
    );

    // Set optimization status to PAUSING
    await this.databaseCalls.setOptimizationStatus(
      accountId,
      optimizationId,
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING
    );

    return queryResponse.body;
  }

  async query(accountId, optimizationId) {
    try {
      logger.log(accountId, 'Querying gcp bucket for result');
      // Begin the estimate and wait for to finish
      const queryResponse = await got.post(
        `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-query`,
        {
          json: { i: optimizationId, PASSWORD: this.configParams.password },
        }
      );
      return queryResponse.body;
    } catch (e) {
      logger.warn(accountId, 'No result available for ', optimizationId, e);
      return null;
    }
  }

  async estimate(accountId, optimizationId, stats, options) {
    // Instruct the compute service to start the optimization
    logger.log(accountId, 'Starting gcp optimization estimate');

    // Add additional flags to json body
    options['-i'] = optimizationId;
    options['-e'] = true;
    options['data'] = stats;
    options['PASSWORD'] = this.configParams.password;

    // Begin the estimate and wait for to finish
    try {
      const startResponse = await got.post(
        `https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-start`,
        {
          json: options,
        }
      );
      logger.log(
        accountId,
        'Estimation Response',
        startResponse.statusCode,
        startResponse.body
      );
      return startResponse.body;
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
    /*
    `curl -X POST "https://us-central1-optimum-library-250223.cloudfunctions.net/softball-sim-query" -N -H "Content-Type:application/json" --data '{"i":"quebec","PASSWORD":"27QQgTVnAX5PzaAAVfdywM9pvSkbb6"}'`
    
    gcloud alpha storage ls --recursive gs://optimization-results/quebec/**

    gsutil ls -l gs://optimization-results/quebec/**
    */
  }
};
