import { OptimizationComputeService } from './service-types';
import logger from './logger';

/**
 * The optimization compute service that doesn't do anything.
 *
 * And if you ask it to do anything, it'll just tell you that it doesn't do anything.
 */
export default class OptimizationComputeGcp
  implements OptimizationComputeService
{
  constructor() {}

  async start(accountId: string, optimizationId: string) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'start' because it's configured not to"
    );
  }

  async pause(accountId: string, optimizationId: string) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'pause' because it's configured not to"
    );
  }

  async query(accountId: string, optimizationId: string) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'query' because it's configured not to"
    );
  }

  async estimate(accountId: string, optimizationId: string, stats, options) {
    // We don't do anything
    logger.log(
      accountId,
      "Optimization compute service not running 'estimate' because it's configured not to"
    );
  }
}
