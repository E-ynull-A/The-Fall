import type { ResourceDelta, ResourceKey } from './kingdom';
import type { CardDefinitionId } from './card';
import type { ProvinceType } from './province';

/**
 * Shared effect language used by cards and events.
 * The engine (EffectManager) interprets these; UI never applies them directly.
 * "Target" effects use the province or kingdom chosen when the card is played
 * (or picked by the event).
 */
export type Effect =
  /** Changes the acting kingdom's resources. */
  | { kind: 'resources'; delta: ResourceDelta }
  /** Advantage for the acting kingdom's active siege. */
  | { kind: 'siege_bonus'; amount: number }
  /** Bonus (×10%) to the acting kingdom's next battle. */
  | { kind: 'battle_bonus'; amount: number }
  /** Reveals the target kingdom's resources for a number of years. */
  | { kind: 'reveal_kingdom'; years: number }
  /** Target province stability. */
  | { kind: 'province_stability'; amount: number }
  /** Target province fortification (0–3). */
  | { kind: 'province_fortification'; amount: number }
  /** Target province garrison. */
  | { kind: 'province_garrison'; amount: number }
  /** Target province food production. */
  | { kind: 'province_food'; amount: number }
  /** Stability of every province the acting kingdom owns. */
  | { kind: 'all_provinces_stability'; amount: number }
  /** Target kingdom stability. */
  | { kind: 'kingdom_stability'; amount: number }
  /** Target kingdom's opinion of the acting kingdom. */
  | { kind: 'opinion'; amount: number }
  /** Adds a card to the acting kingdom's discard pile (deck modification). */
  | { kind: 'add_card'; cardId: CardDefinitionId }
  /** Makes a truce with the target kingdom for a number of years. */
  | { kind: 'make_peace'; years: number }
  /** Gives gold to the target kingdom (tribute). */
  | { kind: 'pay_tribute'; amount: number };

/** Conditions used by card requirements, event triggers and objectives. */
export type Condition =
  | { kind: 'resource_at_least'; resource: ResourceKey; value: number }
  | { kind: 'resource_below'; resource: ResourceKey; value: number }
  | { kind: 'year_at_least'; year: number }
  | { kind: 'active_siege' }
  | { kind: 'at_war' }
  | { kind: 'owns_province_type'; type: ProvinceType }
  /** Some owned province has stability below the value. */
  | { kind: 'province_stability_below'; value: number }
  | { kind: 'province_count_at_least'; value: number };
