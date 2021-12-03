const configAccessor = require('./config-accessor');
const idUtils = require('../id-utils.js');
const constants = require('../constants.js');
const TimeoutUtil = require('./timeout-util');

const net = require('net');

const logger = require('./logger.js');
const { google } = require('googleapis');
const compute = google.compute('v1');

const CPU_CORES = 4; // Must be a power of 2 between 2 and 64 inclusive OR 96

const optimizationCompleteEmailHtml = require('./email/optimization-complete-email-html');

const MONITORING_INTERVAL = 5000;

module.exports = class OptimizationComputeGcp {
  constructor(databaseCalls, emailService, gcpParams) {
    this.monitor = async function (accountId, optimizationId) {
      return async function () {
        // Copy the results into the database
        let result = await computeService.queryResults(optimizationId);
        databaseCalls.setOptimizationResultData(
          accountId,
          optimizationId,
          result
        );

        // Now take actions based on the status of the optimization
        let status = databaseCalls.getOptimizationStatus(
          accountId,
          optimizationId
        );

        if (
          status === constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES ||
          status === constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS_COMP ||
          status === constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS_FUNC
        ) {
          // Continue monitoring
          setTimeout(this.monitor(optimizationId), MONITORING_INTERVAL);
        } else if (status === constants.OPTIMIZATION_STATUS_ENUM.TRANSITION) {
          // Continue monitoring and transition from 'function' to 'compute' and update status to ALLOCATING_RESOURCES
          setTimeout(this.monitor(optimizationId), MONITORING_INTERVAL);
        } else if (status === constants.OPTIMIZATION_STATUS_ENUM.PREEMPTED) {
          // Continue monitoring and restart the optimization
          setTimeout(this.monitor(optimizationId), MONITORING_INTERVAL);
        } else if (status === constants.OPTIMIZATION_STATUS_ENUM.PAUSING_FUNC) {
          // Continue monitoring and update status to PAUSED after 30 seconds
          setTimeout(this.monitor(optimizationId), MONITORING_INTERVAL);
        } else if (status === constants.OPTIMIZATION_STATUS_ENUM.PAUSING_COMP) {
          // Continue monitoring and update status to PAUSED after 30 seconds
          setTimeout(this.monitor(optimizationId), MONITORING_INTERVAL);
        } else if (
          status === constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED ||
          status === constants.OPTIMIZATION_STATUS_ENUM.PAUSED_COMP ||
          status === constants.OPTIMIZATION_STATUS_ENUM.PAUSED_FUNC ||
          status === constants.OPTIMIZATION_STATUS_ENUM.ERROR
        ) {
          // Discontinue monitoring
        } else if (status === constants.OPTIMIZATION_STATUS_ENUM.COMPLETE) {
          // Discontinue monitoring and send completion email
        } else {
          throw new Error('Unrecognized optimization status code ' + status);
        }
      };
    };

    // Google Cloud Platform Authentication for API calls requires an environmental
    // variable that points to the file containing auth credentials
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] = __dirname + '/../cred.json';

    this.createInstance = async function (
      accountId,
      name,
      coreCount,
      optimizationId
    ) {
      const auth = new google.auth.GoogleAuth({
        // Scopes can be specified either as an array or as a single, space-delimited string.
        scopes: ['https://www.googleapis.com/auth/compute'],
      });
      const authClient = await auth.getClient();

      // For custom machine type use this: custom-${coreCount}-${memoryMb}
      // More doc: https://cloud.google.com/compute/docs/reference/rest/v1/instances/insert
      const request = {
        project: gcpParams.project,
        zone: this.getZone(optimizationId),
        resource: {
          name: name,
          machineType: `zones/${this.getZone(
            optimizationId
          )}/machineTypes/n1-highcpu-${coreCount}`,
          scheduling: {
            preemptible: true,
          },
          metadata: {
            items: [
              { key: 'optimization-id', value: optimizationId },
              { key: 'delete-on-shutdown', value: 'yes' }, // Any value will work here, as long as something is set delete will occur
            ],
          },

          networkInterfaces: [
            {
              network: 'global/networks/default',
              // Required if we want internet access, which is not needed for gcp api calls
              accessConfigs: [{ type: 'ONE_TO_ONE_NAT', name: 'External NAT' }],
            },
          ],

          disks: [
            {
              boot: true,
              initializeParams: {
                sourceSnapshot: `global/snapshots/${gcpParams.snapshotName}`,
              },
              autoDelete: true,
            },
          ],
          // This SHOULD make it so that we don't have to include cred.json in the snapshot and
          // auth it in the cleanup script. It auths gcp api calls automatically after the instances
          // is created; however, it's not working as I think it should.
          //
          // Error message when attempting to run the delete command:
          // There was a problem refreshing your current auth tokens: Failed to retrieve
          // http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/[SERVICE ACCOUNT EMAIL]/token
          // from the Google Compute Engine metadata service (404)
          //
          // The other benefit of this (I'm hoping) is that it will prevent us from having to have internet access for
          // these machines. That will keep us from using up our ip address quota or having to mess with NATs. Although, I'm
          // not sure that the delete instance command will work without an interconnect connection.
          /*
          serviceAccounts: [
            {
              email: `optimization@optimum-library-250223.iam.gserviceaccount.com`,
              //scopes: [
              //  'https://www.googleapis.com/auth/cloud-platform',
              //],
            },
          ],
          */
        },
        auth: authClient,
      };

      logger.log(
        accountId,
        `Attempting to insert new gcp compute instance ${name}`
      );
      compute.instances.insert(request, function (err) {
        if (err) {
          logger.error(
            accountId,
            `Failed to insert gcp compute instance`,
            err.code, // 400
            err.message,
            JSON.stringify(err, null, 2)
          );
          throw new Error(err);
        }
        logger.log(accountId, `Inserted new gcp compute instance ${name}`);
      });
    };

    // These methods track the gcp zone we are running commands against.
    // The config lists zones in order of preference. Zones closer to the
    // app server cost less for network egress, but compute resources aren't
    // always available.
    this.zoneMap = {};

    this.getZone = function (optimizationId) {
      let zoneIndex = this.zoneMap[optimizationId];
      if (!zoneIndex) {
        zoneIndex = 0;
        this.zoneMap[optimizationId] = zoneIndex;
      }
      return gcpParams.zones[zoneIndex];
    };

    this.getZoneIndex = function (optimizationId) {
      let zoneIndex = this.zoneMap[optimizationId];
      if (!zoneIndex) {
        zoneIndex = 0;
      }
      return zoneIndex;
    };

    this.nextZone = function (accountId, optimizationId) {
      this.getZone(optimizationId); // Make sure the zone map is populated
      let zoneIndex = this.zoneMap[optimizationId];
      if (zoneIndex < gcpParams.zones.length - 1) {
        this.zoneMap[optimizationId] = this.zoneMap[optimizationId] + 1;
        return true;
      } else {
        logger.error(accountId, 'Zones exhausted');
        return false;
      }
    };

    this.start = async function (accountId, optimizationId) {
      logger.log(
        accountId,
        'Starting simulation on gcp',
        this.getZone(optimizationId)
      );
      try {
        let instanceName = `optimization-${optimizationId}-${this.getZoneIndex(
          optimizationId
        )}`;

        await this.createInstance(
          accountId,
          instanceName,
          CPU_CORES, // CPU count
          optimizationId
        );

        // Don't even bother to wait for the status to be ready, assume that the instance will connect with the optimization server once it starts up.
        // Relying on code like this introduces a bug here for really short optimizations that complete their whole cycle and transition the instance to TERMINATED before
        /*
        await this.waitForInstanceToBeInStatus(
          accountId,
          instanceName,
          "RUNNING"
        );
        logger.log(accountId, "Instance is in state RUNNING");
        */
        return Promise.resolve();
      } catch (error) {
        try {
          // Server errors OR instance by that name already exists
          if (error.code >= 500 || error.code === 409) {
            logger.warn(
              accountId,
              'retrying because of',
              error.code,
              error.message
            );
            return await this.retry(accountId, optimizationId);
          } else {
            logger.error(
              accountId,
              'not retrying because of',
              error.code,
              error.message
            );
            return Promise.reject(`${error.code} - ${error.message}`);
          }
        } catch (error2) {
          return Promise.reject(error2);
        }
      }
    };

    this.retry = async function (accountId, optimizationId) {
      logger.log(accountId, 'attempting retry');
      let moreZonesToProcess = this.nextZone(accountId, optimizationId);
      if (moreZonesToProcess) {
        return await this.start(accountId, optimizationId);
      } else {
        return Promise.reject(
          'Cloud resource shortage - compute zone options exhausted, please try again later'
        );
      }
    };

    this.cleanup = function (accountId, optimizationId) {
      logger.log(accountId, 'running optimization cleanup');
      this.removeZoneCounter(optimizationId);
    };

    this.removeZoneCounter = function (optimizationID) {
      delete this.zoneMap[optimizationID];
    };
  }

  start(accountId, optimizationId) {
    // Set optimization status to ALLOCATING_RESOURCES

    // Instruct the compute service to start the optimization

    // Periodically query for updated status and information
    setTimeout(this.monitor(accountId, optimizationId), MONITORING_INTERVAL);
  }

  async pause(accountId, optimizationId) {}

  async estimate(accountId, optimizationId) {}
};
