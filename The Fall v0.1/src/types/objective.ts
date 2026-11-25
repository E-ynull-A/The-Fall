import type { KingdomId, ResourceKey } from './kingdom';
import type { Effect } from './effect';

export type ObjectiveId = string;

/** How an objective is measured. Evaluated by ObjectiveManager. */
export type ObjectiveRule =
  /** Control every province whose historical owner is the player. */
  | { kind: 'reclaim_historical' }
  /** Hold the capitals of the listed kingdoms. */
  | { kind: 'capture_capitals'; kingdomIds: KingdomId[] }
  /** Reach a resource value before a number of years has passed. */
  | { kind: 'resource_by_deadline'; resource: ResourceKey; value: number; withinYears: number }
  /** N consecutive years ending without famine (food above zero). */
  | { kind: 'no_famine_streak'; years: number }
  /** N consecutive years ending with at most `maxProvinces` provinces. */
  | { kind: 'hold_with_few_provinces'; years: number; maxProvinces: number }
  /** Own every province on the map. */
  | { kind: 'unification' }
  /** Keep the realm (and its capital) for N years. */
  | { kind: 'survive_years'; years: number };

export interface ObjectiveDefinition {
  id: ObjectiveId;
  name: string;
  description: string;
  rule: ObjectiveRule;
  reward: string;
  /** Applied once when the objective is fulfilled. */
  rewardEffects: Effect[];
  /** Fulfilling it ends the campaign in victory. */
  endsCampaign?: boolean;
  /** Only offered in scenario mode. */
  scenarioOnly?: boolean;
}

export type ObjectiveStatus = 'active' | 'completed' | 'failed';

export interface ObjectiveState {
  id: ObjectiveId;
  status: ObjectiveStatus;
  /** Consecutive-year counter for streak objectives. Advanced at end of year. */
  streak: number;
  completedYear: number | null;
}

export interface ObjectiveProgress {
  current: number;
  target: number;
  /** Human readable, e.g. "1 / 2 provinces". */
  label: string;
}
