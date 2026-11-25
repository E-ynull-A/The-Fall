import type { KingdomId } from './kingdom';
import type { ProvinceId } from './province';

/** GDD §7.3 tactical choices. `balanced` is used for ordinary, auto-resolved battles. */
export type Tactic = 'balanced' | 'aggressive' | 'defensive' | 'flanking' | 'retreat';

/** An ongoing siege of a fortified province (GDD §7.4). */
export interface Siege {
  id: string;
  attackerId: KingdomId;
  provinceId: ProvinceId;
  /** Strength committed to the siege; it no longer counts as field army. */
  army: number;
  startedYear: number;
  /** Years of siege completed. Each year wears down the walls by one level. */
  progress: number;
  /** Extra advantage from siege cards (×10%). */
  bonus: number;
}

export type BattleOutcome = 'victory' | 'defeat' | 'retreat' | 'siege_started';

export interface BattleReport {
  id: string;
  year: number;
  attackerId: KingdomId;
  defenderId: KingdomId;
  provinceId: ProvinceId;
  tactic: Tactic;
  committed: number;
  attackerPower: number;
  defenderPower: number;
  attackerLosses: number;
  defenderLosses: number;
  outcome: BattleOutcome;
  captured: boolean;
  notes: string[];
}
