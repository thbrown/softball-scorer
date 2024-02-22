import DatabaseCallsAbstractBlob from './database-calls-abstract-blob';

export interface EmailService {
  sendMessage(
    accountId: string,
    destinationEmail: string,
    subject: string,
    message: string,
    html: string
  );
}
export interface OptimizationComputeService {
  start(
    accountId: string,
    optimizationId: string,
    stats?: unknown,
    options?: Record<string, any>
  ): Promise<any>;
  pause(accountId: string, optimizationId: string): Promise<any>;
  query(accountId: string, optimizationId: string): Promise<any>;
  estimate(
    accountId: string,
    optimizationId: string,
    stats,
    options
  ): Promise<any>;
}
export interface DatabaseService extends DatabaseCallsAbstractBlob {
  init(): void;
  writeBlob(...args): Promise<any>;
  readBlob(...args): Promise<any>;
  deleteBlob(...args): Promise<any>;
  exists(...args): Promise<boolean>;
}
export interface CacheService {
  init(): Promise<void>;
  lockAccount(accountId: string): Promise<any>;
  unlockAccount(accountId: string): Promise<any>;
  lockOptimization(optimizationId: string, serverId: string, ttl): Promise<any>;
  getAncestor(accountId: string, sessionId: string): Promise<any>;
  setAncestor(
    accountId: string,
    sessionId: string,
    ancestor: unknown
  ): Promise<any>;
  setCache(value: unknown, key: string, secondKey: string): Promise<any>;
  getCache(key: string, secondKey: string): Promise<any>;
  deleteCache(key: string, secondKey: string): Promise<any>;
  resetCacheTTL(key: string): Promise<any>;
  putDataTTL(key: string, ttl, value: unknown): Promise<any>;
  getData(accountId: string, field: string): Promise<any>;
  putData(accountId: string, field: string, value: unknown): Promise<any>;
  deleteData(key: string, field: string): Promise<any>;
  getSessionStore(): any;
}
