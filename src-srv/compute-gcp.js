const logger = require("./logger.js");
const { google } = require("googleapis");
const compute = google.compute("v1");
const ip = require("ip");

module.exports = class ComputeGCP {
  constructor(gcpParams) {
    // Google Cloud Platform Authentication for API calls requires an environmental
    // variable that points to the file containing auth credentials
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname + "/../cred.json";

    this.createInstance = function(
      accountId,
      name,
      coreCount,
      memoryMb, // Muiltiple of 256, must be between 1024 and 6656
      remoteIp,
      optimizationId
    ) {
      return new Promise(
        function(resolve, reject) {
          this.authorize(function(authClient) {
            var request = {
              project: gcpParams.project,
              zone: gcpParams.zone,
              resource: {
                name: name,
                machineType: `zones/${gcpParams.zone}/machineTypes/custom-${coreCount}-${memoryMb}`,
                scheduling: {
                  preemptible: true
                },
                metadata: {
                  items: [
                    { key: "remote-ip", value: remoteIp },
                    { key: "optimization-id", value: optimizationId }
                  ]
                },
                networkInterfaces: [{ network: "global/networks/default" }],
                disks: [
                  {
                    boot: true,
                    initializeParams: {
                      sourceSnapshot: `global/snapshots/${gcpParams.snapshotName}`
                    },
                    autoDelete: true
                  }
                ]
              },
              auth: authClient
            };

            compute.instances.insert(request, function(err, response) {
              if (err) {
                logger.error(err);
                reject(accountId, err);
                return;
              }
              resolve();
              logger.log(accountId, "Inserted new instance");
            });
          });
        }.bind(this)
      );
    };

    this.waitForInstanceToBeInStatus = function(
      accountId,
      name,
      desiredStatus
    ) {
      return new Promise(
        function(resolve, reject) {
          this.authorize(async function(authClient) {
            var request = {
              project: gcpParams.project,
              zone: gcpParams.zone,
              instance: name,
              auth: authClient
            };
            let status = "UNKNOWN";

            const MAX_RETRY = 40;
            let counter = 0;
            do {
              // Wait 3 seconds
              await new Promise((resolve, reject) => setTimeout(resolve, 3000));

              // Is the status what we want it to be?
              status = await new Promise(function(resolve, reject) {
                compute.instances.get(request, function(err, response) {
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
                )} - Retrys remaining ${MAX_RETRY - counter}`
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
          });
        }.bind(this)
      );
    };

    this.stopInstance = function(name) {};

    this.deleteInstance = function(name) {};

    this.authorize = function(callback) {
      google.auth.getApplicationDefault(function(err, authClient) {
        if (err) {
          console.error("authentication failed: ", err);
          return;
        }
        if (
          authClient.createScopedRequired &&
          authClient.createScopedRequired()
        ) {
          var scopes = ["https://www.googleapis.com/auth/cloud-platform"];
          authClient = authClient.createScoped(scopes);
        }
        callback(authClient);
      });
    };
  }

  async start(accountId, optimizationId, onError) {
    logger.log(accountId, "Starting simulation on gcp");
    try {
      let instanceName = `optimization-${optimizationId}`;
      await this.createInstance(
        accountId,
        instanceName,
        1, // CPU count
        1024, // Memory MB
        ip.address(),
        optimizationId
      );

      // TODO: There is a bug here for really short optimizations that complete their whole cycle and transition the instance to TERMINATED before
      // we can detect the RUNNING status
      await this.waitForInstanceToBeInStatus(
        accountId,
        instanceName,
        "RUNNING"
      );
      logger.log(accountId, "Instance is in state RUNNING");
      return Promise.resolve();
    } catch (error) {
      logger.error(accountId, error);
      onError(accountId, optimizationId, JSON.stringify(error));
      return Promise.reject();
    }
  }

  async stop(accountId, name) {
    logger.log(accountId, "Stoping simulation on gcp");
  }
};
