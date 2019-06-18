const net = require("net");
const HOST = "127.0.0.1";
const PORT = "8414"; // TODO: move to config?
const logger = require("./logger.js");
const idUtils = require("../id-utils.js");

/*
TODO:
1) Delete execution data
2) Dynamic update frequency
3) Actually send the email if selected
4) Display status message
5) Bug with no consecutive female lineup
*/
module.exports = class OptimizationServer {
  constructor(databaseCalls, cacheCalls) {
    logger.log(null, "Starting Optimization TCP server");

    // Create server to listen for TCP connection on PORT
    net
      .createServer(function(sock) {
        logger.log(
          null,
          "COMPUTER CONNECTED: " + sock.remoteAddress + ":" + sock.remotePort
        );

        sock.on("data", async function(data) {
          let parsedData = JSON.parse(data);
          console.log("RECEIVED:", parsedData);

          if (parsedData.command === "READY") {
            sock.optimizationId = parsedData.optimizationId;
            sock.accountId = idUtils.getAccountIdFromServerId(
              sock.optimizationId
            );

            logger.log(
              sock.accountId,
              "Processing optimization id: " + sock.optimizationId
            );

            // Get all the info we need to run the optimization
            let executionData = await databaseCalls.getOptimizationExecutionData(
              sock.accountId,
              sock.optimizationId
            );
            logger.log(sock.accountId, JSON.stringify(executionData, null, 2));

            let optimizationData = executionData;

            /*
            optimizationData = {
              iterations: 100000,
              lineupType: 1,
              startIndex: 0,
              innings: 7,
              lineup: [
                {
                  id: "Ava",
                  gender: "F",
                  outs: 10,
                  singles: 0,
                  doubles: 2,
                  triples: 3,
                  homeruns: 0
                },
                {
                  id: "Jen",
                  gender: "F",
                  outs: 12,
                  singles: 3,
                  doubles: 2,
                  triples: 1,
                  homeruns: 0
                },
                {
                  id: "Caitlin",
                  gender: "F",
                  outs: 4,
                  singles: 3,
                  doubles: 2,
                  triples: 1,
                  homeruns: 0
                },
                {
                  id: "Sue",
                  gender: "F",
                  outs: 1,
                  singles: 3,
                  doubles: 2,
                  triples: 1,
                  homeruns: 6
                }
              ],
              initialLineup: null,
              initialScore: null,
              initialHistogram: null
            };
            */

            // Get partial results (if any) so we don't start from scratch if we've already run part of this optimization
            let existingResult = await databaseCalls.getOptimizationResultData(
              sock.accountId,
              sock.optimizationId
            );
            logger.log(
              sock.accountId,
              "Paretial Result",
              sock.accountId,
              sock.optimizationId,
              existingResult
            );
            if (existingResult) {
              logger.log(
                sock.accountId,
                "This optimization has partial results",
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
                "No partial results were found, starting from the begining",
                sock.accountId,
                sock.optimizationId
              );
            }

            // Don't edit this object property's names unless you also update the constants in the java optimization code
            let job = {
              optimizationType: 0,
              optimizationData: optimizationData
            };

            logger.log(sock.accountId, JSON.stringify(job, null, 2));

            sock.write(JSON.stringify(job));
            sock.write("\n");

            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              2 // TODO: state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
            );

            console.log("SENT:", JSON.stringify(job));
          } else if (parsedData.command === "IN_PROGRESS") {
            // We've got an update!
            logger.log(
              sock.accountId,
              "Received update for",
              sock.optimizationId
            );

            // Write the partial results to the db
            delete parsedData.command;
            await databaseCalls.setOptimizationResultData(
              sock.accountId,
              sock.optimizationId,
              parsedData
            );
            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              2, // TODO: state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
              `${parsedData.complete} of ${parsedData.total} (${(
                (parsedData.complete / parsedData.total) *
                100
              ).toFixed(1)}%)`
            );

            // TODO: test if this is necessary - I though it would be required for any server side writes to the db, but status
            // changes seem to tolerate writes with no cache clears...
            await cacheCalls.clearStateMd5();
          } else if (parsedData.command === "COMPLETE") {
            logger.log(sock.accountId, "COMPLETE");

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
            await cacheCalls.clearStateMd5();
            sock.isComplete = true;
          } else if (parsedData.command === "ERROR") {
            logger.log(sock.accountId, "ERROR");
            logger.log(sock.accountId, parsedData.message);
            logger.log(sock.accountId, parsedData.trace);
            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
              parsedData.message
            );
            sock.errorRecorded = true;
          } else {
            console.log("Unrecognized command", parsedData);
          }
        });

        sock.on("close", async function(data) {
          // Closed connection
          logger.log(
            sock.accountId,
            "CLOSED: " + sock.remoteAddress + " " + sock.remotePort,
            sock.isComplete,
            sock.errorRecorded
          );
        });

        sock.on("error", async function(err) {
          logger.log(sock.accountId, "ERROR2: ", err);
          // Transition the optimization to error state if we haven't already(TODO: is the errorRecorded check necessary?)
          if (!sock.errorRecorded) {
            let message = JSON.stringify(err);
            if (err.code === "ECONNRESET") {
              message =
                "The connection to compute resource was terminated. This might be because compute resources in the cloud are currently sparse. Please resume the optimization later.";
            }

            await databaseCalls.setOptimizationStatus(
              sock.accountId,
              sock.optimizationId,
              5, // TODO: state.OPTIMIZATION_STATUS_ENUM.ERROR
              message
            );
          }
        });
      })
      .listen(PORT, HOST);
  }
};
logger.log(null, "Optimization server listening on " + PORT);
