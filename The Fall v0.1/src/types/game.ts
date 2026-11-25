import type { DiplomaticRelation, Kingdom, KingdomId } from './kingdom';
import type { Province, ProvinceId } from './province';
import type { DeckState } from './card';
import type { ActiveEvent, ChronicleEntry, DelayedEffect } from './event';
import type { ObjectiveId, ObjectiveState } from './objective';
import type { YearReport } from './economy';
import type { BattleReport, Siege } from './military';

export const SAVE_VERSION = 1;

export type GameMode = 'campaign' | 'scenario';

/** GDD §5 turn sequence. */
export type TurnPhase = 'start_of_year' | 'decisions' | 'military' | 'world' | 'end_of_year';

export type CampaignStatus = 'ongoing' | 'victory' | 'defeat';

/**
 * The complete, serialisable campaign state.
 * Everything needed to save/load lives here; no UI state.
 */
export interface GameState {
  saveVersion: number;
  campaignId: string;
  mode: GameMode;
  /** Current seeded RNG state. Every random roll advances it. */
  rngState: number;
  startYear: number;
  year: number;
  phase: TurnPhase;
  status: CampaignStatus;
  /**
   * The last year whose start-of-year economy was resolved.
   * Guards against running the yearly calculation twice (GDD §5, §17.7).
   */
  lastResolvedYear: number | null;
  playerKingdomId: KingdomId;
  kingdoms: Record<KingdomId, Kingdom>;
  provinces: Record<ProvinceId, Province>;
  relations: DiplomaticRelation[];
  deck: DeckState;
  activeEvents: ActiveEvent[];
  delayedEffects: DelayedEffect[];
  objectives: ObjectiveState[];
  primaryObjectiveId: ObjectiveId;
  chronicle: ChronicleEntry[];
  /** Report of the most recent End Year, for the player. Null in the opening year. */
  lastYearReport: YearReport | null;
  /** Why the campaign was lost, when status is 'defeat'. */
  defeatReason: string | null;
  /** Objective just fulfilled, waiting to be celebrated by the UI. */
  pendingTriumph: string | null;
  /** Consecutive years of total collapse (no gold, no food, low stability). */
  crisisYears: number;
  /** Set in scenario mode. */
  scenario: { id: string; lastYear: number } | null;
  /** Cards played by the player this year. */
  cardsPlayedThisYear: number;
  /** Year in which the player last used the free card redraw. */
  cardRedrawYear: number | null;
  /** Kingdom id → last year (inclusive) its secrets are visible to the player. */
  revealedUntil: Record<KingdomId, number>;
  /** Pending bonus (×10%) for each kingdom's next battle. */
  battleBonus: Record<KingdomId, number>;
  sieges: Siege[];
  /** Event id → last year it fired (keeps events from repeating too often). */
  eventHistory: Record<string, number>;
  /** Most recent battles, newest last. */
  battles: BattleReport[];
  /** Monotonic counter for generating unique ids inside the state. */
  nextId: number;
}
