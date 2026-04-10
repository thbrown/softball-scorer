// Branded ID types
// Using plain aliases for now since shared-lib types use plain `string` for IDs.
// Once shared-lib is updated to use branded types, switch back to nominal branding:
//   declare const __brand: unique symbol;
//   type Brand<K, T> = K & { readonly [__brand]: T };
export type PlayerId = string;
export type TeamId = string;
export type GameId = string;
export type OptimizationId = string;
export type PlateAppearanceId = string;

// Factory functions (safe conversion from string)
export const asPlayerId = (id: string): PlayerId => id as PlayerId;
export const asTeamId = (id: string): TeamId => id as TeamId;
export const asGameId = (id: string): GameId => id as GameId;
export const asOptimizationId = (id: string): OptimizationId =>
  id as OptimizationId;
export const asPlateAppearanceId = (id: string): PlateAppearanceId =>
  id as PlateAppearanceId;

// Validation
export const isValidId = (id: unknown): id is string =>
  typeof id === 'string' && id.length === 14;
