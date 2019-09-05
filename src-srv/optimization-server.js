const net = require('net');
const configAccessor = require('./config-accessor');
const logger = require('./logger.js');
const idUtils = require('../id-utils.js');

const ip = require('ip');

const HOST = ip.address();
const PORT = configAccessor.getOptimizationServerPort();

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

        sock.on('data', async function(data) {
          let parsedData = JSON.parse(data);
          //console.log('RECEIVED:', parsedData);

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
            logger.log(
              sock.accountId,
              'Partial Result',
              sock.accountId,
              sock.optimizationId,
              existingResult
            );
            if (existingResult) {
              logger.log(
                sock.accountId,
                'This optimization has partial results',
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
                sock.accountId,
                sock.optimizationId
              );
            }

            // Don't edit this object property's names unless you also update the constants in the java optimization code
            let job = {
              optimizationType: 0,
              optimizationData: optimizationData,
            };

            logger.log(sock.accountId, JSON.stringify(job, null, 2));

            sock.write(JSON.stringify(job));
            sock.write('\n');

            let success = await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              2, // TODO: state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
              null,
              1 // TODO: state.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
            );
            if (!success) {
              // Hopefully the user just deleted this optimization while it was running or paused it
              logger.warn(
                sock.accountId,
                sock.optimizationId,
                `Unexpected state transition to IN_PROGRESS, expected status to be ALLOCATING_RESOURCES`
              );
              // TODO: can we just send the server a terminate command instead?
              sock.destroy();
              return;
            }

            logger.log('?', 'SENT:', JSON.stringify(job));
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
            let success = await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              2, // TODO: state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
              `${parsedData.complete} of ${parsedData.total} (${(
                (parsedData.complete / parsedData.total) *
                100
              ).toFixed(1)}%)`,
              2 // TODO: state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
            );
            if (!success) {
              // Hopefully the user just deleted this optimization while it was running or paused it
              // TODO: pauses shouldn't warn
              logger.warn(
                sock.accountId,
                sock.optimizationId,
                `Unexpected state transition to IN_PROGRESS. Expected status to be IN_PROGRESS before transition`
              );
              sock.destroy();
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
            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              3 // TODO: state.OPTIMIZATION_STATUS_ENUM.COMPLETE
            );
            sock.isComplete = true;

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
            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
              parsedData.message
              // Any status can transition to ERROR
            );
            sock.errorRecorded = true;
          } else {
            console.log('Unrecognized command', parsedData);
          }
        });

        sock.on('close', async function(hadError) {
          // Closed connection
          logger.log(
            sock.accountId,
            'CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort,
            sock.isComplete,
            sock.errorRecorded,
            hadError
          );
        });

        sock.on('error', async function(err) {
          logger.warn(sock.accountId, 'SOCKET ERROR: ', err);
          // Transition the optimization to error state if we haven't already(TODO: is the errorRecorded check necessary?)
          if (!sock.errorRecorded) {
            if (err.code === 'ECONNRESET') {
              // The compute client was closed unexpectedly, this is a retryable condition.
              // Delegate to each compute implementation to decide how to handle it
              logger.log(sock.accountId, 'attempting retry');
              try {
                return await retry(accountId, optimizationId);
              } catch (error) {
                computeService.cleanup(sock.accountId, sock.optimizationId);
                await databaseCalls.setOptimizationStatus(
                  sock.accountId,
                  sock.optimizationId,
                  5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
                  `Insufficient cloud resources, try again later`
                );
                logger.log(
                  sock.accountId,
                  `Error: ${JSON.stringify(error)} caused by ${err}`
                );
              }
            } else {
              // Otherwise set the status to error
              logger.log(
                sock.accountId,
                'not attempting retry',
                err.code,
                JSON.stringify(err, null, 2)
              );
              computeService.cleanup(sock.accountId, sock.optimizationId);
              await databaseCalls.setOptimizationStatus(
                sock.accountId,
                sock.optimizationId,
                5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
                JSON.stringify(err)
                // Any status can transition to ERROR
              );
            }
          }
        });
      })
      .listen(PORT, HOST);
  }
};
logger.log(null, 'Optimization server listening on ' + PORT);
