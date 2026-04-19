// Re-export nominal branded ID types and factory functions from shared-lib.
// The actual Brand<T,B> definition lives in shared-lib/types/branded-ids.ts.
export type {
  PlayerId,
  TeamId,
  GameId,
  OptimizationId,
  PlateAppearanceId,
} from 'shared-lib';
export {
  asPlayerId,
  asTeamId,
  asGameId,
  asOptimizationId,
  asPlateAppearanceId,
} from 'shared-lib';

// Validation (not in shared-lib since it's client-specific)
export const isValidId = (id: unknown): id is string =>
  typeof id === 'string' && id.length === 14;
