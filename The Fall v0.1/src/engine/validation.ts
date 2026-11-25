import type { GameState } from '../types/game';
import { RESOURCE_BOUNDS, RESOURCE_KEYS } from './ResourceManager';
import { hasCardDefinition } from './CardManager';

/**
 * Structural integrity checks for a game state.
 * Used by tests now and by save/load validation in Phase 7.
 * Returns a list of problems; an empty list means the state is consistent.
 */
export function validateGameState(state: GameState): string[] {
  const errors: string[] = [];
  const provinceIds = new Set(Object.keys(state.provinces));
  const kingdomIds = new Set(Object.keys(state.kingdoms));

  if (!kingdomIds.has(state.playerKingdomId)) errors.push('Player kingdom does not exist');

  for (const [id, kingdom] of Object.entries(state.kingdoms)) {
    if (kingdom.id !== id) errors.push(`Kingdom key/id mismatch: ${id}`);
    for (const key of RESOURCE_KEYS) {
      const v = kingdom.resources[key];
      const { min, max } = RESOURCE_BOUNDS[key];
      if (!Number.isFinite(v) || v < min || v > max) errors.push(`${id}.${key} out of bounds: ${v}`);
    }
    const capital = state.provinces[kingdom.capitalProvinceId];
    if (!capital) errors.push(`${id} capital ${kingdom.capitalProvinceId} missing`);
    else if (!kingdom.isEliminated && !capital.isCapital) errors.push(`${id} capital not flagged as capital`);
  }

  for (const [id, province] of Object.entries(state.provinces)) {
    if (province.id !== id) errors.push(`Province key/id mismatch: ${id}`);
    if (!kingdomIds.has(province.ownerId)) errors.push(`${id} has unknown owner ${province.ownerId}`);
    if (!kingdomIds.has(province.historicalOwnerId)) errors.push(`${id} has unknown historical owner`);
    if (province.stability < 0 || province.stability > 100) errors.push(`${id} stability out of bounds`);
    if (!['low', 'normal', 'high'].includes(province.taxLevel)) errors.push(`${id} has invalid tax level`);
    if (province.neighbors.includes(id)) errors.push(`${id} lists itself as a neighbor`);
    for (const n of province.neighbors) {
      const other = state.provinces[n];
      if (!other) errors.push(`${id} has unknown neighbor ${n}`);
      else if (!other.neighbors.includes(id)) errors.push(`Neighbor link ${id} → ${n} is not symmetric`);
    }
  }

  const { drawPile, hand, discardPile, handSize } = state.deck;
  const all = [...drawPile, ...hand, ...discardPile];
  const instanceIds = new Set(all.map((c) => c.instanceId));
  if (instanceIds.size !== all.length) errors.push('Duplicate card instance in deck');
  for (const card of all) {
    if (!hasCardDefinition(card.definitionId)) errors.push(`Unknown card ${card.definitionId}`);
  }
  if (hand.length > handSize) errors.push(`Hand has ${hand.length} cards, limit ${handSize}`);
  if (!provinceIds.size) errors.push('No provinces');
  if (!state.objectives.some((o) => o.id === state.primaryObjectiveId)) errors.push('Primary objective is not tracked');
  if (!['ongoing', 'victory', 'defeat'].includes(state.status)) errors.push('Invalid campaign status');
  for (const e of state.activeEvents) {
    if (e.targetProvinceId && !provinceIds.has(e.targetProvinceId)) errors.push(`Event ${e.instanceId} targets unknown province`);
  }
  for (const siege of state.sieges) {
    if (!provinceIds.has(siege.provinceId)) errors.push(`Siege of unknown province ${siege.provinceId}`);
    if (siege.army <= 0) errors.push(`Siege ${siege.id} has no army`);
    if (state.provinces[siege.provinceId]?.ownerId === siege.attackerId) errors.push(`Siege ${siege.id} of own province`);
  }

  return errors;
}
