const configAccessor = require('../config-accessor');

describe('cache', () => {
  test('optimization locking', async () => {
    const cacheCalls = configAccessor.getCacheService();

    let optimizationId = '12345678';
    let testTTL = 1;
    let serverId1 = 'A';
    let serverId2 = 'B';

    // Nobody holds the lock, should succeed
    let result = await cacheCalls.lockOptimization(
      optimizationId,
      serverId1,
      testTTL
    );
    expect(result).toBe(true);

    // Server 1 holds the lock, server2 to attmpting to aquire the lock should fail
    let result2 = await cacheCalls.lockOptimization(
      optimizationId,
      serverId2,
      testTTL
    );
    expect(result2).toBe(false);

    await sleep(testTTL * 1000 + 100);

    // Server 1's lock has expired, server2 to attmpting to aquire the lock should succeed
    let result3 = await cacheCalls.lockOptimization(
      optimizationId,
      serverId2,
      testTTL
    );
    expect(result3).toBe(true);

    await sleep(testTTL * 500 + 100);

    // Server 2 holds the lock and is attempting to extend it, should suceed
    let result4 = await cacheCalls.lockOptimization(
      optimizationId,
      serverId2,
      testTTL
    );
    expect(result4).toBe(true);

    await sleep(testTTL * 500 + 100);

    // Server 2 holds the lock, the original locking has expired but the extension should still be active,
    // Server 2 attempting to aquire the lock should fail
    let result5 = await cacheCalls.lockOptimization(
      optimizationId,
      serverId1,
      testTTL
    );
    expect(result5).toBe(false);

    await sleep(testTTL * 500 + 100);

    // Server 2's extended lock has now expired. Server1 to attmpting to aquire the lock should suceed
    let result6 = await cacheCalls.lockOptimization(
      optimizationId,
      serverId1,
      testTTL
    );
    expect(result6).toBe(true);
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
