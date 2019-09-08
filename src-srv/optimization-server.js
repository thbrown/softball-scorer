const net = require('net');
const configAccessor = require('./config-accessor');
const logger = require('./logger.js');
const idUtils = require('../id-utils.js');

const ip = require('ip');

const HOST = ip.address();
const PORT = configAccessor.getOptimizationServerPort();

const SOCKET_TIMEOUT = 15000;

/*
TODO: we have a lot of numbers in this file that refere to optimization states, 
it would be a lot clearer if we could reference them by their enum value instead of number

exp.OPTIMIZATION_STATUS_ENUM = Object.freeze({
  NOT_STARTED: 0,
  ALLOCATING_RESOURCES: 1,
  IN_PROGRESS: 2,
  COMPLETE: 3,
  PAUSED: 4,
  ERROR: 5,
  PAUSING: 6,
});
*/

module.exports = class OptimizationServer {
  constructor(databaseCalls, computeService) {
    logger.log(null, 'Starting Optimization TCP server');

    // Create server to listen for TCP connection on PORT
    net
      .createServer(function(sock) {
        logger.log(
          null,
          'COMPUTER CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort
        );

        sock.setTimeout(SOCKET_TIMEOUT);

        sock.on('data', async function(data) {
          let parsedData = JSON.parse(data);

          if (parsedData.command === 'READY') {
            sock.optimizationId = parsedData.optimizationId;
            sock.accountId = idUtils.getAccountIdFromServerId(
              sock.optimizationId
            );

            logger.log(
              sock.accountId,
              'Processing optimization id: ' + sock.optimizationId
            );

            // Get all the info we need to run the optimization
            let executionData = await databaseCalls.getOptimizationExecutionData(
              sock.accountId,
              sock.optimizationId
            );

            let optimizationData = executionData;

            // Get partial results (if any) so we don't start from scratch if we've already run part of this optimization
            let existingResult = await databaseCalls.getOptimizationResultData(
              sock.accountId,
              sock.optimizationId
            );
            if (existingResult) {
              logger.log(
                sock.accountId,
                'This optimization has partial results',
                sock.optimizationId,
                existingResult,
                JSON.stringify(existingResult, null, 2)
              );
              optimizationData.initialHistogram = existingResult.histogram;
              optimizationData.initialScore = existingResult.score;
              optimizationData.initialLineup = existingResult.lineup;
              optimizationData.startIndex = existingResult.complete;
            } else {
              logger.log(
                sock.accountId,
                'No partial results were found, starting from the begining',
                sock.optimizationId
              );
            }

            // Don't edit this object's property names unless you also update the constants in the java optimization code
            let job = {
              optimizationType: 0,
              optimizationData: optimizationData,
            };

            logger.log(sock.accountId, JSON.stringify(job, null, 2));

            sock.write(JSON.stringify(job));
            sock.write('\n');

            let success = await setOptimizationStatus(
              sock,
              2, // IN_PROGRESS
              null,
              1 // ALLOCATING_RESOURCES
            );
            if (!success) {
              let status = await databaseCalls.getOptimizationStatus(
                sock.accountId,
                sock.optimizationId
              );

              if (status === undefined) {
                // If the user deleted this optimization while it was allocating resources, that's fine
                logger.log(
                  sock.accountId,
                  sock.optimizationId,
                  `Optimization was deleted while status was ALLOCATING_RESOURCES.`
                );
              } else {
                // Perhaps we started another optimization instance for an optimization that was already running?
                // This should kill the duplicate instance
                logger.warn(
                  sock.accountId,
                  sock.optimizationId,
                  `Unexpected state transition to from ${status} to IN_PROGRESS. Expected status to be ALLOCATING_RESOURCES before transition.`
                );
              }

              sock.destroy();
              sock.preventRetry = true;
            }

            logger.log(sock.accountId, 'SENT:', JSON.stringify(job));
          } else if (parsedData.command === 'IN_PROGRESS') {
            // We've got an update!
            logger.log(
              sock.accountId,
              'Received update for',
              sock.optimizationId
            );

            // Write the partial results to the db
            delete parsedData.command;
            await databaseCalls.setOptimizationResultData(
              sock.accountId,
              sock.optimizationId,
              parsedData
            );
            let success = await setOptimizationStatus(
              sock,
              2, // IN_PROGRESS
              `${parsedData.complete} of ${parsedData.total} (${(
                (parsedData.complete / parsedData.total) *
                100
              ).toFixed(1)}%)`,
              2 // IN_PROGRESS
            );

            if (!success) {
              let status = await databaseCalls.getOptimizationStatus(
                sock.accountId,
                sock.optimizationId
              );

              if (status === undefined) {
                // User deleted this optimization while it was running OR
                logger.log(
                  sock.accountId,
                  sock.optimizationId,
                  `Optimization was deleted while status was IN_PROGRESS`
                );
              } else if (status === 4) {
                // User paused the optimization
                logger.log(
                  sock.accountId,
                  sock.optimizationId,
                  `Optimization was paused by the user`
                );
              } else {
                // Perhaps we started another optimization instance for an optimization that was already running?
                // This should kill the duplicate instance
                logger.warn(
                  sock.accountId,
                  sock.optimizationId,
                  `Unexpected state transition to from ${status} to IN_PROGRESS. Expected status to be IN_PROGRESS before transition.`
                );
              }
              sock.destroy();
              sock.preventRetry = true;
              return;
            }
          } else if (parsedData.command === 'COMPLETE') {
            logger.log(sock.accountId, 'COMPLETE');

            // Write the final results to the db
            delete parsedData.command;
            await databaseCalls.setOptimizationResultData(
              sock.accountId,
              sock.optimizationId,
              parsedData
            );
            await setOptimizationStatus(
              sock,
              3 // TODO: state.OPTIMIZATION_STATUS_ENUM.COMPLETE
            );

            // Send Completion Email
            let optimization = await databaseCalls.getOptimizationDetails(
              sock.accountId,
              sock.optimizationId
            );
            let account = await databaseCalls.getAccountById(sock.accountId);
            if (optimization.sendEmail && account.verifiedEmail) {
              let email = configAccessor.getEmailService();
              email.sendMessage(
                sock.accountId,
                account.email,
                `Softball.app Optimization ${optimization.name} has Completed!`,
                JSON.stringify(parsedData, null, 2)
              );
            } else {
              logger.warn(
                sock.accountId,
                'Did not send email on optimization completion',
                optimization.sendEmail,
                account.verifiedEmail
              );
            }

            // Delete the execution_data
            await databaseCalls.setOptimizationExecutionData(
              sock.accountId,
              sock.optimizationId,
              null
            );

            // Call any compute spicific cleanup
            computeService.cleanup(sock.accountId, sock.optimizationId);
          } else if (parsedData.command === 'ERROR') {
            logger.log(sock.accountId, 'ERROR');
            logger.log(sock.accountId, parsedData.message);
            logger.log(sock.accountId, parsedData.trace);
            await setOptimizationStatus(
              sock,
              5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
              parsedData.message
              // Any status can transition to ERROR
            );
            computeService.cleanup(sock.accountId, sock.optimizationId);
          } else {
            console.log('Unrecognized command', parsedData);
          }
        });

        sock.on('close', async function(hadError) {
          // The compute client was closed, this could be for any reason: complete optimization,
          // network connectivity loss, instance preemption, whatever. We'll ether do nothing
          // or attempt a retry depending on the optimization's status or if we explicitly diallow
          // retrys (like if the user pasued the optimization or deleted it while it was running)
          if (
            sock.preventRetry === true ||
            sock.optStatus === undefined ||
            sock.optStatus === 0 || // NOT_STARTED
            sock.optStatus === 3 || // COMPLETE
            sock.optStatus === 4 || // PAUSED
            sock.optStatus === 5 || // ERROR
            sock.optStatus === 6 || // PAUSING
            sock.optStatus === 1 // ALLOCATING_RESOURCES
          ) {
            // Do nothing, we expected the socket to close in these cases
            logger.log(
              sock.accountId,
              'Expected socket CLOSED: ' +
                sock.remoteAddress +
                ' ' +
                sock.remotePort,
              hadError
            );
          } else if (
            sock.optStatus == 2 // IN_PROGRESS
          ) {
            // Unexpected socket close, initiate a retry
            logger.warn(
              sock.accountId,
              'Unexpected socket CLOSED: ' +
                sock.remoteAddress +
                ' ' +
                sock.remotePort,
              hadError
            );

            try {
              // Set status back to allocating resources
              await setOptimizationStatus(
                sock,
                1, // ALLOCATING_RESOURCES
                null,
                2 // IN_PROGRESS
              );
              await computeService.retry(sock.accountId, sock.optimizationId);
            } catch (error) {
              computeService.cleanup(sock.accountId, sock.optimizationId);
              await setOptimizationStatus(
                sock,
                5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
                `Insufficient resources, try again later`
              );
              logger.log(
                sock.accountId,
                `Insufficient resources. Error occured during retry attempt: ${JSON.stringify(
                  error
                )}`
              );
            }
          } else {
            logger.warn(
              sock.accountId,
              'unrecognized optimization status',
              sock.optStatus
            );
          }
        });

        sock.on('error', async function(err) {
          logger.warn(sock.accountId, 'SOCKET ERROR: ', err);
          // Transition the optimization to error state if we haven't already (5 === ERROR state)
          if (sock.optStatus !== 5) {
            if (err.code === 'ECONNRESET') {
              // The compute client was closed unexpectedly, this is a retryable condition
              // so we wont transition to error yet
              logger.log(
                sock.accountId,
                'retryable error, not transitioning to error'
              );
            } else {
              // Otherwise set the status to error
              logger.log(
                sock.accountId,
                'not retryable error, transitioning to error',
                err.code,
                JSON.stringify(err, null, 2)
              );
              computeService.cleanup(sock.accountId, sock.optimizationId);
              await setOptimizationStatus(
                sock,
                5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
                JSON.stringify(err)
                // Any status can transition to ERROR
              );
            }
          }
        });

        sock.on('timeout', async function() {
          logger.warn(sock.accountId, 'TCP socket timeout');
          sock.destroy();
        });
      })
      .listen(PORT, HOST);

    // Helper method that sets the optimization's status in the db and
    // sets the status in the socket itself (so we can use it locally
    // without going back to the db)
    let setOptimizationStatus = async function(
      socket,
      newStatus,
      message,
      oldStatus
    ) {
      let success = await databaseCalls.setOptimizationStatus(
        socket.accountId,
        socket.optimizationId,
        newStatus,
        message,
        oldStatus
      );
      if (success) {
        socket.optStatus = newStatus;
      }
      return success;
    };
  }
};
logger.log(null, 'Optimization server listening on ' + PORT);
