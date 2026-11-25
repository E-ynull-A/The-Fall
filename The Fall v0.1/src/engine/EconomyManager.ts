import type { GameState } from '../types/game';
import type { KingdomId, Resources } from '../types/kingdom';
import type { Province } from '../types/province';
import type { EconomyBreakdown, ProvinceEconomyLine } from '../types/economy';
import { ECONOMY } from '../data/economy/economyRules';
import { MILITARY } from '../data/military/militaryRules';
import { applyResourceDelta, clampResource } from './ResourceManager';
import { getProvincesOwnedBy } from './selectors';

/** Gold a single province yields this year. Not rounded. Recently conquered land pays less. */
export function provinceTaxYield(p: Province, year?: number): number {
  const efficiency = ECONOMY.minTaxEfficiency + (1 - ECONOMY.minTaxEfficiency) * (p.stability / 100);
  const occupied =
    year !== undefined && p.conqueredYear !== null && year - p.conqueredYear < MILITARY.occupationYears;
  return p.taxIncome * efficiency * ECONOMY.taxMultiplier[p.taxLevel] * (occupied ? MILITARY.occupationTaxFactor : 1);
}

export function provinceFoodConsumption(p: Province): number {
  return ECONOMY.populationFoodBase + p.development;
}

export function administrationCost(provinceCount: number): number {
  return (
    Math.floor(provinceCount * ECONOMY.adminPerProvince) +
    Math.max(0, provinceCount - ECONOMY.adminThreshold) * ECONOMY.adminOverExtension
  );
}

/**
 * Pure calculation of one kingdom's start-of-year budget from the current state.
 * Used for the Treasury forecast and for the real resolution, so both always agree.
 */
export function computeEconomy(state: GameState, kingdomId: KingdomId): EconomyBreakdown {
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) throw new Error(`Unknown kingdom ${kingdomId}`);
  const { gold, food, military } = kingdom.resources;
  const owned = getProvincesOwnedBy(state, kingdomId);

  const provinceLines: ProvinceEconomyLine[] = owned.map((p) => ({
    provinceId: p.id,
    gold: provinceTaxYield(p, state.year),
    food: p.foodProduction,
    consumption: provinceFoodConsumption(p),
  }));

  const taxIncome = Math.round(provinceLines.reduce((s, l) => s + l.gold, 0));
  const foodProduced = provinceLines.reduce((s, l) => s + l.food, 0);
  const foodPopulation = provinceLines.reduce((s, l) => s + l.consumption, 0);
  const foodArmy = Math.ceil(military / ECONOMY.militaryPerFood);

  const armyUpkeep = Math.ceil(military / ECONOMY.militaryPerGold);
  const garrisonUpkeep = Math.ceil(owned.reduce((s, p) => s + p.garrison, 0) / ECONOMY.garrisonPerGold);
  const administration = administrationCost(owned.length);
  const castleMaintenance = owned.filter((p) => p.type === 'castle').length * ECONOMY.castleMaintenance;
  const totalExpenses = armyUpkeep + garrisonUpkeep + administration + castleMaintenance;

  const goldAvailable = gold + taxIncome;
  const unpaidGold = Math.max(0, totalExpenses - goldAvailable);
  const foodAvailable = food + foodProduced - foodPopulation - foodArmy;
  const foodShortfall = Math.max(0, -foodAvailable);

  return {
    kingdomId,
    provinceLines,
    taxIncome,
    foodProduced,
    foodPopulation,
    foodArmy,
    armyUpkeep,
    garrisonUpkeep,
    administration,
    castleMaintenance,
    totalExpenses,
    netGold: taxIncome - totalExpenses,
    netFood: foodProduced - foodPopulation - foodArmy,
    unpaidGold,
    foodShortfall,
  };
}

export interface EconomyOutcome {
  state: GameState;
  breakdown: EconomyBreakdown;
  famine: boolean;
  unpaidArmy: boolean;
  notes: string[];
}

/**
 * Applies the start-of-year economy to one kingdom (GDD §5 Phase 1):
 * income, food, upkeep, administration, then the knock-on effects on stability and legitimacy.
 */
export function applyEconomy(state: GameState, kingdomId: KingdomId): EconomyOutcome {
  const breakdown = computeEconomy(state, kingdomId);
  const kingdom = state.kingdoms[kingdomId];
  if (!kingdom) throw new Error(`Unknown kingdom ${kingdomId}`);
  const notes: string[] = [];

  // 1–4. Income, food, upkeep and administration.
  let resources: Resources = applyResourceDelta(kingdom.resources, {
    gold: breakdown.netGold,
    food: breakdown.netFood,
  });

  const unpaidArmy = breakdown.unpaidGold > 0;
  const famine = breakdown.foodShortfall > 0;

  if (unpaidArmy) {
    const deserters = Math.max(1, Math.ceil(resources.military * ECONOMY.desertionRate));
    resources = applyResourceDelta(resources, {
      military: -deserters,
      stability: -ECONOMY.unpaidStabilityLoss,
      legitimacy: -ECONOMY.unpaidLegitimacyLoss,
    });
    notes.push(`The treasury could not pay ${breakdown.unpaidGold} gold of wages. ${deserters} strength deserted.`);
  }

  if (famine) {
    const loss = Math.min(
      ECONOMY.famineMaxStabilityLoss,
      ECONOMY.famineBaseStabilityLoss + breakdown.foodShortfall,
    );
    resources = applyResourceDelta(resources, { stability: -loss });
    notes.push(`Famine: the granaries ran ${breakdown.foodShortfall} food short. Stability −${loss}.`);
  }

  // 5. Province stability: tax policy, famine and spreading unrest.
  const provinces = { ...state.provinces };
  const spreadingUnrest = kingdom.resources.stability < ECONOMY.unrestThreshold;
  let provinceStabilitySum = 0;
  let provinceCount = 0;
  for (const p of Object.values(state.provinces)) {
    if (p.ownerId !== kingdomId) continue;
    let change = ECONOMY.taxStabilityEffect[p.taxLevel];
    if (famine) change -= ECONOMY.famineProvinceStabilityLoss;
    if (spreadingUnrest) change -= ECONOMY.unrestProvinceLoss;
    const stability = clampResource('stability', p.stability + change);
    provinces[p.id] = stability === p.stability ? p : { ...p, stability };
    provinceStabilitySum += stability;
    provinceCount += 1;
  }
  if (spreadingUnrest) notes.push('Unrest is spreading through the provinces.');

  // Kingdom stability drifts toward the provinces' average.
  if (provinceCount > 0) {
    const avg = provinceStabilitySum / provinceCount;
    const drift = Math.trunc((avg - resources.stability) / ECONOMY.stabilityDriftDivisor);
    resources = applyResourceDelta(resources, { stability: drift });
  }

  // Legitimacy follows sustained order or disorder.
  if (resources.stability < ECONOMY.lowStabilityForLegitimacy) {
    resources = applyResourceDelta(resources, { legitimacy: -ECONOMY.lowStabilityLegitimacyLoss });
    notes.push('Disorder erodes faith in the crown.');
  } else if (resources.stability >= ECONOMY.highStabilityForLegitimacy) {
    resources = applyResourceDelta(resources, { legitimacy: ECONOMY.highStabilityLegitimacyGain });
  }

  return {
    state: {
      ...state,
      provinces,
      kingdoms: { ...state.kingdoms, [kingdomId]: { ...kingdom, resources } },
    },
    breakdown,
    famine,
    unpaidArmy,
    notes,
  };
}
