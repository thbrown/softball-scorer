/*eslint no-process-exit:*/
'use strict';

const logger = require('../logger.js');

const configAccessor = require('../config-accessor.js');

describe('optimization', () => {
  let compute;
  beforeAll(async () => {
    compute = configAccessor.getOptimizationComputeService();
  });

  test('Do nothing', async () => {});

  // This is useful for testing that the integration with gcp is working properly.
  // This test simulates the api call to start a gcp it starts instance (if configured to use gcp).
  // I'm commenting this out to avoid accidental instance creation and expense
  /*
  test('See if start creates an instance', async () => {
    logger.log('test', `Starting`);
    try {
      let data = await compute.start('some-account-id', 'first');
      logger.log('test', `Done1`);
    } catch (ee) {
      // Jest refuses to show anything that is logged at this point which makes me furious and wastes hours of my time.
      // This is just so that we can see the error.
      expect(ee).toBe('Something the error message is not');
    } finally {
      logger.log('test', `Done2`);
    }
    logger.log('test', `Done3`);
  });
  */
});
