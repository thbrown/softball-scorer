// Nominal brand using unique symbol
declare const __brand: unique symbol;
type Brand<K, T> = K & { readonly [__brand]: T };

// Branded ID types
export type PlayerId = Brand<string, 'PlayerId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type GameId = Brand<string, 'GameId'>;
export type OptimizationId = Brand<string, 'OptimizationId'>;
export type PlateAppearanceId = Brand<string, 'PlateAppearanceId'>;

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
