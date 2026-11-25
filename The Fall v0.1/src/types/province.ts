import type { KingdomId } from './kingdom';
import type { TaxLevel } from './economy';

export type ProvinceId = string;

/** GDD §3.3 */
export type ProvinceType =
  | 'fertile_lands'
  | 'mountain_pass'
  | 'coastal_port'
  | 'mining_region'
  | 'city'
  | 'castle';

export type ProvinceTraitId = string;

export interface ProvinceTrait {
  id: ProvinceTraitId;
  name: string;
  description: string;
}

export interface Province {
  id: ProvinceId;
  name: string;
  ownerId: KingdomId;
  /** Who held this province before the fall. Used by "Reclaim the Old Borders". */
  historicalOwnerId: KingdomId;
  type: ProvinceType;
  isCapital: boolean;
  /** Gold per year at full stability. */
  taxIncome: number;
  /** Food per year. */
  foodProduction: number;
  /** Max military strength recruitable here per year. */
  recruitmentPotential: number;
  /** Local order, 0–100. Low values feed unrest and rebellion. */
  stability: number;
  /** Infrastructure level, 1–5. */
  development: number;
  /** Troops stationed in the province (local defence). */
  garrison: number;
  /** Defensive works, 0–3. */
  fortification: number;
  neighbors: ProvinceId[];
  traits: ProvinceTraitId[];
  /** Tax policy set by the owner. */
  taxLevel: TaxLevel;
  /** Year of the last improvement action (one per year). */
  lastImprovedYear: number | null;
  /** Year of the last recruitment here (one per year). */
  lastRecruitedYear: number | null;
  /** Year the current owner conquered it; null if held since the start. */
  conqueredYear: number | null;
}

/** Static province data; runtime-only fields are filled in when a campaign starts. */
export type ProvinceDefinition = Omit<Province, 'taxLevel' | 'lastImprovedYear' | 'lastRecruitedYear' | 'conqueredYear'>;
