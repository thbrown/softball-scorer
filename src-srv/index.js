/*eslint no-process-exit:*/
const SoftballServer = require('./softball-server');

const configAccessor = require('./config-accessor');
const logger = require('./logger.js');

// Fake top-level async
async function runServer() {
  // Log on interruptions
  process.on('SIGINT', function () {
    logger.log('sys', 'SIGINT');
    process.exit(0);
  });
  process.on('SIGTERM', function () {
    logger.log('sys', 'SIGTERM');
    process.exit(0);
  });
  process.on('exit', function () {
    process.stdout.write('Bye\n');
  });

  // Inject the cache service based on config values
  const cacheService = await configAccessor.getCacheService();

  // Inject the database service based on config values
  const databaseService = await configAccessor.getDatabaseService(cacheService);

  // Inject the email service based on config values
  const emailService = configAccessor.getEmailService();

  // Inject the compute service (for running optimizations)
  const optimizationCompute = configAccessor.getOptimizationComputeService(
    databaseService,
    emailService
  );

  // Specify the ports
  let appPort = configAccessor.getAppServerPort();

  // Start the server!
  const softballServer = new SoftballServer(
    appPort,
    databaseService,
    cacheService,
    optimizationCompute
  );
  softballServer.start();
}
runServer();
