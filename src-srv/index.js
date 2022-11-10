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
  const cacheService = configAccessor.getCacheService();

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

  // DB Migration
  // Move all data from postgres to blob store before app starts, overriding existing entries. This code needs to be deleted after migration completes.
  // Lets just print all account ids here first
  const DatabaseCallsPostgres = require('./database-calls-postgres');
  let postgres = new DatabaseCallsPostgres(
    'localhost',
    '5432',
    'postgres',
    'postgres',
    'Softball',
    cacheService,
    (err) => {
      if (err) {
        logger.error('sys', 'Encountered an error connecting to db', err);
        process.exit(1);
      }
      logger.log('sys', 'Connected to db.');
    }
  );

  async function migrate() {
    const schemaValidation = require('../shared-lib').default.schemaValidation;
    const schemaMigration = require('../shared-lib').default.schemaMigration;
    const TLSchemas =
      require('../shared-lib').default.schemaValidation.TLSchemas;
    let allAccounts = await postgres.getAllAccountIds();
    logger.log('N/A', 'ACCOUNT IDS', allAccounts.length);
    for (let account of allAccounts) {
      if (
        account.email.includes('syncTest') ||
        account.email.includes('lifecycleTest') ||
        account.email.includes('test')
      ) {
        continue;
      }
      let accountState = await postgres.getState(account.account_id);

      // Append private fields
      console.log(account);
      accountState.account.passwordHash = account.password_hash;
      accountState.account.passwordTokenExpiration =
        account.password_token_expiration
          ? new Date(account.password_token_expiration).getTime()
          : 0;
      accountState.account.passwordTokenHash = account.password_token_hash
        ? account.password_token_hash.replace(/\//g, '_')
        : 'aaa';

      accountState.account.accountId = account.account_id.toString();
      accountState.account.email = account.email;
      accountState.account.emailConfirmed = account.verified_email;
      accountState.account.balance = 2000; // $20 of credit to existing accounts

      // Update the schema
      let migrationResult = schemaMigration.updateSchema(
        null,
        accountState,
        'full'
      );
      console.log('Schema validation result', migrationResult);
      if (migrationResult !== 'UPDATED') {
        throw new Error(
          `Schema validation did not complete with the expected status. Status was: ${migrationResult} expected 'UPDATED'`
        );
      }

      // Now validate the schema
      schemaValidation.validateSchema(accountState, TLSchemas.FULL);
      logger.log(account.email, accountState.teams.length);

      //BlobLocation[(BlobLocation['DATA'] = 0)] = 'DATA';
      //BlobLocation[(BlobLocation['EMAIL_LOOKUP'] = 1)] = 'EMAIL_LOOKUP';
      //BlobLocation[(BlobLocation['TOKEN_LOOKUP'] = 2)] = 'TOKEN_LOOKUP';
      //BlobLocation[(BlobLocation['PUBLIC_ID_LOOKUP'] = 3)] = 'PUBLIC_ID_LOOKUP';
      const { BlobLocation } = require('./database-calls-abstract-blob-types');

      // Write data
      console.log(
        'WRINGING ACCOUNT',
        BlobLocation.DATA,
        accountState.account.accountId.toString()
      );

      await databaseService.writeBlob(
        'migration',
        BlobLocation.DATA,
        accountState.account.accountId.toString(),
        accountState
      );

      // Write email-account
      await databaseService.writeBlob(
        'migration',
        BlobLocation.EMAIL_LOOKUP,
        accountState.account.email,
        {
          accountId: accountState.account.accountId.toString(),
        }
      );

      // Write token-account
      await databaseService.writeBlob(
        'migration',
        BlobLocation.TOKEN_LOOKUP,
        accountState.account.passwordTokenHash,
        {
          accountId: accountState.account.accountId.toString(),
        }
      );

      // Write public-account-team for each team
      for (let team of accountState.teams) {
        if (team.publicIdEnabled) {
          await databaseService.writeBlob(
            'migration',
            BlobLocation.PUBLIC_ID_LOOKUP,
            team.publicId,
            {
              accountId: accountState.account.accountId.toString(),
              teamId: team.id,
            }
          );
        }
      }
    }
  }
  //migrate();
  logger.log('sys', 'Migration complete');

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
