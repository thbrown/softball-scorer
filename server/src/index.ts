import { SoftballServer } from './softball-server';
import * as configAccessor from './config-accessor';
import * as logger from './logger';
import * as context from './context';

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
  const databaseService = await configAccessor.getDatabaseService();

  // Inject the email service based on config values
  const emailService = await configAccessor.getEmailService();

  // Inject the compute service (for running optimizations)
  const optimizationCompute =
    await configAccessor.getOptimizationComputeService(
      databaseService,
      emailService
    );

  // Specify the ports
  const appPort = configAccessor.getAppServerPort();

  // Start the server!
  const softballServer = new SoftballServer(
    appPort,
    databaseService,
    cacheService,
    optimizationCompute
  );

  context.setServer(softballServer);

  softballServer.start();
}
runServer();
