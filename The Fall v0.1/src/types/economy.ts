import type { KingdomId, ResourceDelta } from './kingdom';
import type { ProvinceId } from './province';

export type TaxLevel = 'low' | 'normal' | 'high';

export interface ProvinceEconomyLine {
  provinceId: ProvinceId;
  gold: number;
  food: number;
  consumption: number;
}

/**
 * One kingdom's start-of-year budget. Produced by EconomyManager.computeEconomy,
 * used both for the forecast (Treasury) and for the actual yearly resolution.
 */
export interface EconomyBreakdown {
  kingdomId: KingdomId;
  provinceLines: ProvinceEconomyLine[];
  // income
  taxIncome: number;
  foodProduced: number;
  // food use
  foodPopulation: number;
  foodArmy: number;
  // gold expenses
  armyUpkeep: number;
  garrisonUpkeep: number;
  administration: number;
  castleMaintenance: number;
  totalExpenses: number;
  // results
  netGold: number;
  netFood: number;
  /** Gold the treasury could not pay. > 0 means unpaid soldiers. */
  unpaidGold: number;
  /** Food missing after reserves are exhausted. > 0 means famine. */
  foodShortfall: number;
}

/** Summary of the turn the player just finished, shown after End Year. */
export interface YearReport {
  /** The new year that just began. */
  year: number;
  economy: EconomyBreakdown;
  famine: boolean;
  unpaidArmy: boolean;
  /** Net change of the player's resources across the whole End Year resolution. */
  resourceChange: ResourceDelta;
  notes: string[];
  /** What happened in the world during the year: battles, diplomacy, AI moves. */
  worldNotes: string[];
}

export type ProvinceActionKind = 'develop_infrastructure' | 'improve_food' | 'suppress_unrest' | 'build_defenses';
