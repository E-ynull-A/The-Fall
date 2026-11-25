import type { ResourceDelta } from './kingdom';
import type { Condition, Effect } from './effect';

export type EventDefinitionId = string;

export interface DelayedEffectTemplate {
  /** Years after the choice when the effect resolves. */
  afterYears: number;
  delta: ResourceDelta;
  description: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  effects: Effect[];
  delayed: DelayedEffectTemplate[];
}

/** How an event picks the province it concerns, if any. */
export type EventProvinceTarget = 'lowest_stability' | 'random_owned' | 'random_fertile' | 'random_coastal';

/** GDD §9: conditions, choices, immediate and delayed effects. */
export interface EventDefinition {
  id: EventDefinitionId;
  name: string;
  /** May contain {province} and {kingdom} placeholders. */
  description: string;
  conditions: Condition[];
  /** Relative chance of being picked among eligible events. 0 = only triggered by the engine. */
  weight: number;
  provinceTarget?: EventProvinceTarget;
  /** How alarming the event is, for display. */
  severity: 'crisis' | 'warning' | 'opportunity';
  choices: EventChoice[];
}

/** An event waiting for the player's choice. */
export interface ActiveEvent {
  instanceId: string;
  definitionId: EventDefinitionId;
  year: number;
  targetProvinceId?: string;
  /** For diplomatic events: the kingdom that sent the envoy. */
  targetKingdomId?: string;
}

/** A consequence scheduled for a future year. */
export interface DelayedEffect {
  id: string;
  triggerYear: number;
  delta: ResourceDelta;
  description: string;
  sourceId: string;
}

export type ChronicleKind = 'system' | 'turn' | 'card' | 'event' | 'battle' | 'diplomacy';

/** Player-facing history ("Chronicle"). */
export interface ChronicleEntry {
  id: string;
  year: number;
  kind: ChronicleKind;
  message: string;
}
