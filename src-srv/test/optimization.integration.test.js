/*eslint no-process-exit:*/
'use strict';

const logger = require('../logger.js');

const configAccessor = require('../config-accessor.js');

describe('optimization', () => {
  let compute;
  beforeAll(async () => {
    compute = configAccessor.getComputeService();
  });

  // This is useful for testing integration with gcp is working properly. If the app is configured to use gcp it starts instaces.
  // I'm commenting this out to avoid accidental instance creation and expense
  /*
  test.only('See if start creates an instance', async () => {
    logger.log('test', `Starting`);
    try {
      let data = await compute.start('some-account-id', 'some-optimization-dd');
      logger.log('test', `Done1`);
    } catch (ee) {
      // Jest refuses to show anything that is logged at this point which makes me furious and wastes hours of my time.
      // This is just so that we can see the error.
      expect(ee).toBe('Something the error message is not');
    } finally {
      logger.log('test', `Done2`);
    }
    logger.log('test', `Done3`);

    logger.log('test', `Starting`);
    try {
      let data = await compute.start('some-account-id', 'some-optimization-dd');
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
