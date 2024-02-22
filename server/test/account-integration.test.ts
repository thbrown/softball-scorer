import { test, describe, beforeAll, afterAll } from 'vitest';
import {
  startServer,
  stopServer,
  randomId,
  signup,
  login,
  deleteAccount,
} from './test-utils';

describe('sync', () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  test('Test account lifecycle', async () => {
    const email = `lifecycleTest${randomId(10)}@softball.app`;
    const password = 'pizza';
    // Signup
    await signup(email, password);
    // Login
    const sessionId = await login(email, password);
    // Delete
    await deleteAccount(sessionId);
  });
});
