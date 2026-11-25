import type { GameState } from '../types/game';
import type { ProvinceId } from '../types/province';
import type { ProvinceActionKind, TaxLevel } from '../types/economy';
import type { KingdomId, ResourceDelta } from '../types/kingdom';
import { MILITARY } from '../data/military/militaryRules';
import { PROVINCE_ACTIONS } from '../data/economy/economyRules';
import { applyResourceDelta, canAfford, missingResources, payCost } from './ResourceManager';
import { addChronicle } from './chronicle';

export type ActionCheck = { ok: true; cost: ResourceDelta } | { ok: false; reason: string; cost: ResourceDelta };

/** Cost of an improvement action on a province, given its current state. */
export function provinceActionCost(state: GameState, provinceId: ProvinceId, kind: ProvinceActionKind): ResourceDelta {
  const p = state.provinces[provinceId];
  if (!p) return {};
  switch (kind) {
    case 'develop_infrastructure':
      return { gold: PROVINCE_ACTIONS.develop_infrastructure.goldCostPerLevel * p.development };
    case 'improve_food':
      return { gold: PROVINCE_ACTIONS.improve_food.baseGoldCost + p.foodProduction };
    case 'suppress_unrest':
      return { military: PROVINCE_ACTIONS.suppress_unrest.militaryCost };
    case 'build_defenses':
      return { gold: PROVINCE_ACTIONS.build_defenses.goldCostPerLevel * (p.fortification + 1) };
  }
}

/** Validates an improvement action. UI uses the reason to explain disabled buttons. */
export function checkProvinceAction(
  state: GameState,
  provinceId: ProvinceId,
  kind: ProvinceActionKind,
  actorId: KingdomId = state.playerKingdomId,
): ActionCheck {
  const cost = provinceActionCost(state, provinceId, kind);
  const p = state.provinces[provinceId];
  const player = state.kingdoms[actorId];
  if (!p || !player) return { ok: false, reason: 'Unknown province.', cost };
  if (state.status !== 'ongoing') return { ok: false, reason: 'The campaign has ended.', cost };
  if (p.ownerId !== actorId) return { ok: false, reason: 'You do not rule this province.', cost };
  if (p.lastImprovedYear === state.year) return { ok: false, reason: 'Already improved this year.', cost };

  if (kind === 'develop_infrastructure' && p.development >= PROVINCE_ACTIONS.develop_infrastructure.maxDevelopment) {
    return { ok: false, reason: 'Fully developed.', cost };
  }
  if (kind === 'improve_food' && p.foodProduction >= PROVINCE_ACTIONS.improve_food.maxFood) {
    return { ok: false, reason: 'The land can yield no more.', cost };
  }
  if (kind === 'suppress_unrest' && p.stability >= 100) {
    return { ok: false, reason: 'The province is already calm.', cost };
  }
  if (kind === 'build_defenses' && p.fortification >= PROVINCE_ACTIONS.build_defenses.maxFortification) {
    return { ok: false, reason: 'The defenses are complete.', cost };
  }
  if (!canAfford(player.resources, cost)) {
    return { ok: false, reason: `Not enough ${missingResources(player.resources, cost).join(' and ')}.`, cost };
  }
  return { ok: true, cost };
}

export function performProvinceAction(
  state: GameState,
  provinceId: ProvinceId,
  kind: ProvinceActionKind,
  actorId: KingdomId = state.playerKingdomId,
): GameState {
  const check = checkProvinceAction(state, provinceId, kind, actorId);
  if (!check.ok) return state;
  const p = state.provinces[provinceId]!;
  const player = state.kingdoms[actorId]!;
  let resources = payCost(player.resources, check.cost);
  let province = { ...p, lastImprovedYear: state.year };
  let message = '';

  switch (kind) {
    case 'develop_infrastructure':
      province = { ...province, development: p.development + 1, taxIncome: p.taxIncome + 1 };
      message = `Roads and markets built in ${p.name}. Development is now ${province.development}.`;
      break;
    case 'improve_food':
      province = { ...province, foodProduction: p.foodProduction + 1 };
      message = `New fields cleared in ${p.name}. It now yields ${province.foodProduction} food.`;
      break;
    case 'suppress_unrest': {
      const cfg = PROVINCE_ACTIONS.suppress_unrest;
      province = { ...province, stability: Math.min(100, p.stability + cfg.stabilityGain) };
      resources = applyResourceDelta(resources, { legitimacy: -cfg.legitimacyLoss });
      message = `Soldiers restore order in ${p.name}. The people obey, but do not forget.`;
      break;
    }
    case 'build_defenses':
      province = { ...province, fortification: p.fortification + 1 };
      message = `New walls rise around ${p.name}. Fortification is now ${province.fortification}.`;
      break;
  }

  return addChronicle(
    {
      ...state,
      provinces: { ...state.provinces, [provinceId]: province },
      kingdoms: { ...state.kingdoms, [player.id]: { ...player, resources } },
    },
    'turn',
    player.isPlayer ? message : `${player.shortName}: ${message}`,
  );
}

// ── Recruitment (Phase 5) ─────────────────────────────────────────────────

export function recruitCost(amount: number): ResourceDelta {
  return { gold: amount * MILITARY.recruitGoldPerStrength, food: amount * MILITARY.recruitFoodPerStrength };
}

export function checkRecruit(state: GameState, provinceId: ProvinceId, amount: number, actorId: KingdomId = state.playerKingdomId): ActionCheck {
  const cost = recruitCost(amount);
  const p = state.provinces[provinceId];
  const k = state.kingdoms[actorId];
  if (!p || !k) return { ok: false, reason: 'Unknown province.', cost };
  if (state.status !== 'ongoing') return { ok: false, reason: 'The campaign has ended.', cost };
  if (p.ownerId !== actorId) return { ok: false, reason: 'You do not rule this province.', cost };
  if (p.lastRecruitedYear === state.year) return { ok: false, reason: 'Already recruited here this year.', cost };
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, reason: 'Recruit at least 1.', cost };
  if (amount > p.recruitmentPotential) return { ok: false, reason: `At most ${p.recruitmentPotential} can be raised here.`, cost };
  if (!canAfford(k.resources, cost)) {
    return { ok: false, reason: `Not enough ${missingResources(k.resources, cost).join(' and ')}.`, cost };
  }
  return { ok: true, cost };
}

/** Raises troops: costs gold and food, angers the province, adds to the field army. */
export function recruit(state: GameState, provinceId: ProvinceId, amount: number, actorId: KingdomId = state.playerKingdomId): GameState {
  const check = checkRecruit(state, provinceId, amount, actorId);
  if (!check.ok) return state;
  const p = state.provinces[provinceId]!;
  const k = state.kingdoms[actorId]!;
  const resources = applyResourceDelta(payCost(k.resources, check.cost), { military: amount });
  const next: GameState = {
    ...state,
    kingdoms: { ...state.kingdoms, [actorId]: { ...k, resources } },
    provinces: {
      ...state.provinces,
      [provinceId]: {
        ...p,
        lastRecruitedYear: state.year,
        stability: Math.max(0, p.stability - amount * MILITARY.recruitStabilityPerStrength),
      },
    },
  };
  return k.isPlayer ? addChronicle(next, 'turn', `${amount} recruits raised in ${p.name}.`) : next;
}

export function setTaxLevel(
  state: GameState,
  provinceId: ProvinceId,
  level: TaxLevel,
  actorId: KingdomId = state.playerKingdomId,
): GameState {
  const p = state.provinces[provinceId];
  if (!p || p.ownerId !== actorId || p.taxLevel === level || state.status !== 'ongoing') return state;
  return { ...state, provinces: { ...state.provinces, [provinceId]: { ...p, taxLevel: level } } };
}
