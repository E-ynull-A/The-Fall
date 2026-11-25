import type { ProvinceId } from './province';

export type KingdomId = string;

/** The five primary kingdom statistics (GDD §4). */
export interface Resources {
  /** Treasury. Non-negative, uncapped. */
  gold: number;
  /** Food reserves. Non-negative, uncapped. */
  food: number;
  /** Field army strength. Non-negative, uncapped. */
  military: number;
  /** Internal order, 0–100. */
  stability: number;
  /** Acceptance of the ruler, 0–100. */
  legitimacy: number;
}

export type ResourceKey = keyof Resources;

/** A partial change to resources. Positive = gain, negative = loss. */
export type ResourceDelta = Partial<Resources>;

/** Drives AI priorities (GDD §8). Only data in Phase 1; AI arrives in Phase 6. */
export type KingdomPersonality = 'expansionist' | 'mercantile' | 'cautious';

export interface Kingdom {
  id: KingdomId;
  name: string;
  /** Short name used in compact UI. */
  shortName: string;
  /** Map / UI color (CSS color string). */
  color: string;
  isPlayer: boolean;
  capitalProvinceId: ProvinceId;
  resources: Resources;
  personality: KingdomPersonality;
  /** Kingdoms that have been destroyed stay in state for history/objectives. */
  isEliminated: boolean;
}

export type DiplomaticStance = 'war' | 'peace' | 'truce' | 'alliance';

export interface DiplomaticRelation {
  kingdomA: KingdomId;
  kingdomB: KingdomId;
  stance: DiplomaticStance;
  /** -100 (hatred) .. 100 (friendship). */
  opinion: number;
  /** Year the current war began (null when not at war). */
  warSince: number | null;
  /** Last year (inclusive) of a truce. */
  truceUntil: number | null;
  /** Year the player last took a diplomatic action toward this kingdom. */
  lastActionYear: number | null;
}
