const logger = require('./logger.js');
const { google } = require('googleapis');
const compute = google.compute('v1');
const ip = require('ip');

const CPU_CORES = 4; // Must be a power of 2 between 2 and 64 inclusive OR 96

module.exports = class ComputeGCP {
  constructor(gcpParams) {
    // Google Cloud Platform Authentication for API calls requires an environmental
    // variable that points to the file containing auth credentials
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] = __dirname + '/../cred.json';

    this.createInstance = async function (
      accountId,
      name,
      coreCount,
      remoteIp,
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
              { key: 'remote-ip', value: remoteIp },
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

          reject(err);
          return;
        }
        logger.log(accountId, `Inserted new gcp compute instance ${name}`);
        resolve();
      });
    };

    this.waitForInstanceToBeInStatus = async function (
      accountId,
      name,
      desiredStatus
    ) {
      const auth = new google.auth.GoogleAuth({
        // Scopes can be specified either as an array or as a single, space-delimited string.
        scopes: ['https://www.googleapis.com/auth/compute'],
      });
      const authClient = await auth.getClient();

      var request = {
        project: gcpParams.project,
        zone: this.getZone(optimizationId),
        instance: name,
        auth: authClient,
      };
      let status = 'UNKNOWN';

      const MAX_RETRY = 40;
      let counter = 0;
      do {
        // Wait 3 seconds
        await new Promise((resolve, reject) => setTimeout(resolve, 3000));

        // Is the status what we want it to be?
        status = await new Promise(function (resolve, reject) {
          compute.instances.get(request, function (err, response) {
            if (err) {
              logger.error(accountId, err);
              reject(err);
              return;
            }
            resolve(response);
          });
        });
        logger.log(
          accountId,
          `Status is now ${JSON.stringify(
            status,
            null,
            2
          )} - Retries remaining ${MAX_RETRY - counter}`
        );
        counter++;
      } while (status !== desiredStatus && counter < MAX_RETRY);

      // Either it worked or it didn't
      if (counter >= MAX_RETRY) {
        logger.error(
          accountId,
          `Timeout while waiting for instance ${name} to be in status ${desiredStatus}. Instance was in status ${status} instead.`
        );
        reject(
          `Timeout while waiting for instance ${name} to be in status ${desiredStatus}. Instance was in status ${status} instead.`
        );
      } else {
        resolve();
      }
    };

    this.stopInstance = function (name) {};

    this.deleteInstance = function (name) {};

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
        /*
        // We've exhausted our list of zones, wait a couple minutes and try again
        function sleep(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await sleep(120000);
        this.zoneMap[optimizationId] = 0;
        */
      }
    };

    this.removeZoneCounter = function (optimizationID) {
      delete this.zoneMap[optimizationID];
    };
  }

  async start(accountId, optimizationId) {
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
        ip.address(),
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
  }

  async retry(accountId, optimizationId) {
    logger.log(accountId, 'attempting retry');
    let moreZonesToProcess = this.nextZone(accountId, optimizationId);
    if (moreZonesToProcess) {
      return await this.start(accountId, optimizationId);
    } else {
      return Promise.reject(
        'Cloud resource shortage - compute zone options exhausted, please try again later'
      );
    }
  }

  async cleanup(accountId, optimizationId) {
    logger.log(accountId, 'running optimization cleanup');
    this.removeZoneCounter(optimizationId);
  }

  async stop(accountId, name) {
    logger.log(accountId, 'Stopping simulation on gcp - NOT IMPLEMENTED');
  }
};
