import type { GameState } from '../types/game';
import type { KingdomId } from '../types/kingdom';
import type { ProvinceId } from '../types/province';
import type { Condition, Effect } from '../types/effect';
import { applyResourceDelta, clampResource } from './ResourceManager';
import { changeOpinion, isAtWarWithAnyone } from './relations';
import { makePeace } from './DiplomacyManager';
import { getProvincesOwnedBy } from './selectors';

export interface EffectContext {
  /** The kingdom playing the card or facing the event. */
  actorId: KingdomId;
  targetProvinceId?: ProvinceId;
  targetKingdomId?: KingdomId;
}

function patchProvince(state: GameState, id: ProvinceId | undefined, fn: (p: GameState['provinces'][string]) => GameState['provinces'][string]): GameState {
  if (!id) return state;
  const p = state.provinces[id];
  if (!p) return state;
  return { ...state, provinces: { ...state.provinces, [id]: fn(p) } };
}

/** Applies one effect. Pure; unknown targets are ignored. */
export function applyEffect(state: GameState, effect: Effect, ctx: EffectContext): GameState {
  const actor = state.kingdoms[ctx.actorId];
  if (!actor) return state;

  switch (effect.kind) {
    case 'resources':
      return {
        ...state,
        kingdoms: { ...state.kingdoms, [actor.id]: { ...actor, resources: applyResourceDelta(actor.resources, effect.delta) } },
      };
    case 'siege_bonus': {
      const idx = state.sieges.findIndex((s) => s.attackerId === actor.id);
      if (idx < 0) return state;
      const sieges = [...state.sieges];
      sieges[idx] = { ...sieges[idx]!, bonus: sieges[idx]!.bonus + effect.amount };
      return { ...state, sieges };
    }
    case 'battle_bonus':
      return { ...state, battleBonus: { ...state.battleBonus, [actor.id]: (state.battleBonus[actor.id] ?? 0) + effect.amount } };
    case 'reveal_kingdom':
      if (!ctx.targetKingdomId) return state;
      return { ...state, revealedUntil: { ...state.revealedUntil, [ctx.targetKingdomId]: state.year + effect.years - 1 } };
    case 'province_stability':
      return patchProvince(state, ctx.targetProvinceId, (p) => ({ ...p, stability: clampResource('stability', p.stability + effect.amount) }));
    case 'province_fortification':
      return patchProvince(state, ctx.targetProvinceId, (p) => ({ ...p, fortification: Math.max(0, Math.min(3, p.fortification + effect.amount)) }));
    case 'province_garrison':
      return patchProvince(state, ctx.targetProvinceId, (p) => ({ ...p, garrison: Math.max(0, p.garrison + effect.amount) }));
    case 'province_food':
      return patchProvince(state, ctx.targetProvinceId, (p) => ({ ...p, foodProduction: Math.max(0, p.foodProduction + effect.amount) }));
    case 'all_provinces_stability': {
      const provinces = { ...state.provinces };
      for (const p of getProvincesOwnedBy(state, actor.id)) {
        provinces[p.id] = { ...p, stability: clampResource('stability', p.stability + effect.amount) };
      }
      return { ...state, provinces };
    }
    case 'kingdom_stability': {
      const target = ctx.targetKingdomId ? state.kingdoms[ctx.targetKingdomId] : undefined;
      if (!target) return state;
      return {
        ...state,
        kingdoms: {
          ...state.kingdoms,
          [target.id]: { ...target, resources: applyResourceDelta(target.resources, { stability: effect.amount }) },
        },
      };
    }
    case 'opinion':
      if (!ctx.targetKingdomId) return state;
      return changeOpinion(state, actor.id, ctx.targetKingdomId, effect.amount);
    case 'add_card': {
      if (!actor.isPlayer) return state;
      const instance = { instanceId: `${effect.cardId}#x${state.nextId}`, definitionId: effect.cardId };
      return { ...state, nextId: state.nextId + 1, deck: { ...state.deck, discardPile: [...state.deck.discardPile, instance] } };
    }
    case 'make_peace':
      if (!ctx.targetKingdomId) return state;
      return makePeace(state, actor.id, ctx.targetKingdomId, effect.years);
    case 'pay_tribute': {
      const target = ctx.targetKingdomId ? state.kingdoms[ctx.targetKingdomId] : undefined;
      if (!target) return state;
      const amount = Math.min(effect.amount, actor.resources.gold);
      return {
        ...state,
        kingdoms: {
          ...state.kingdoms,
          [actor.id]: { ...actor, resources: applyResourceDelta(actor.resources, { gold: -amount }) },
          [target.id]: { ...target, resources: applyResourceDelta(target.resources, { gold: amount }) },
        },
      };
    }
  }
}

export function applyEffects(state: GameState, effects: readonly Effect[], ctx: EffectContext): GameState {
  return effects.reduce((s, e) => applyEffect(s, e, ctx), state);
}

/** Evaluates a condition for a kingdom. */
export function checkCondition(state: GameState, kingdomId: KingdomId, c: Condition): boolean {
  const k = state.kingdoms[kingdomId];
  if (!k) return false;
  switch (c.kind) {
    case 'resource_at_least':
      return k.resources[c.resource] >= c.value;
    case 'resource_below':
      return k.resources[c.resource] < c.value;
    case 'year_at_least':
      return state.year >= c.year;
    case 'active_siege':
      return state.sieges.some((s) => s.attackerId === kingdomId);
    case 'at_war':
      return isAtWarWithAnyone(state, kingdomId);
    case 'owns_province_type':
      return getProvincesOwnedBy(state, kingdomId).some((p) => p.type === c.type);
    case 'province_stability_below':
      return getProvincesOwnedBy(state, kingdomId).some((p) => p.stability < c.value);
    case 'province_count_at_least':
      return getProvincesOwnedBy(state, kingdomId).length >= c.value;
  }
}
