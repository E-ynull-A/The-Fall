import type { GameState } from '../types/game';
import type { Kingdom, KingdomId } from '../types/kingdom';
import type { Province, ProvinceId } from '../types/province';

/** Read-only queries over GameState. Safe to call from UI. */

export function getPlayerKingdom(state: GameState): Kingdom {
  const kingdom = state.kingdoms[state.playerKingdomId];
  if (!kingdom) throw new Error('Player kingdom missing from state');
  return kingdom;
}

export function getProvincesOwnedBy(state: GameState, kingdomId: KingdomId): Province[] {
  return Object.values(state.provinces).filter((p) => p.ownerId === kingdomId);
}

export function getProvince(state: GameState, id: ProvinceId): Province | undefined {
  return state.provinces[id];
}

export function getNeighborProvinces(state: GameState, id: ProvinceId): Province[] {
  const province = state.provinces[id];
  if (!province) return [];
  return province.neighbors.map((n) => state.provinces[n]).filter((p): p is Province => p !== undefined);
}

/** True when the province touches territory owned by another kingdom. */
export function isFrontier(state: GameState, id: ProvinceId): boolean {
  const province = state.provinces[id];
  if (!province) return false;
  return getNeighborProvinces(state, id).some((n) => n.ownerId !== province.ownerId);
}

export function getKingdomList(state: GameState): Kingdom[] {
  return Object.values(state.kingdoms);
}

/**
 * Raw yearly totals from owned provinces, before stability modifiers,
 * upkeep and administration (those rules arrive with the economy in Phase 3).
 */
export function getRawProvinceTotals(state: GameState, kingdomId: KingdomId) {
  const owned = getProvincesOwnedBy(state, kingdomId);
  return {
    provinces: owned.length,
    tax: owned.reduce((sum, p) => sum + p.taxIncome, 0),
    food: owned.reduce((sum, p) => sum + p.foodProduction, 0),
    recruitment: owned.reduce((sum, p) => sum + p.recruitmentPotential, 0),
    garrison: owned.reduce((sum, p) => sum + p.garrison, 0),
  };
}
