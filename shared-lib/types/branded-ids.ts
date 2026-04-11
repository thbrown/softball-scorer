// Nominal branded ID types.
// This file is NOT auto-generated and will not be overwritten by json-schema-to-typescript.
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type PlayerId = Brand<string, 'PlayerId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type GameId = Brand<string, 'GameId'>;
export type OptimizationId = Brand<string, 'OptimizationId'>;
export type PlateAppearanceId = Brand<string, 'PlateAppearanceId'>;

// Factory functions — only call at system boundaries (URL params, API responses, test fixtures)
export const asPlayerId = (id: string): PlayerId => id as PlayerId;
export const asTeamId = (id: string): TeamId => id as TeamId;
export const asGameId = (id: string): GameId => id as GameId;
export const asOptimizationId = (id: string): OptimizationId => id as OptimizationId;
export const asPlateAppearanceId = (id: string): PlateAppearanceId => id as PlateAppearanceId;
