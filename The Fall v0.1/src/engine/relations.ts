import type { GameState } from '../types/game';
import type { DiplomaticRelation, KingdomId } from '../types/kingdom';

export function getRelation(state: GameState, a: KingdomId, b: KingdomId): DiplomaticRelation | undefined {
  return state.relations.find(
    (r) => (r.kingdomA === a && r.kingdomB === b) || (r.kingdomA === b && r.kingdomB === a),
  );
}

export function updateRelation(
  state: GameState,
  a: KingdomId,
  b: KingdomId,
  patch: (r: DiplomaticRelation) => DiplomaticRelation,
): GameState {
  return {
    ...state,
    relations: state.relations.map((r) =>
      (r.kingdomA === a && r.kingdomB === b) || (r.kingdomA === b && r.kingdomB === a) ? patch(r) : r,
    ),
  };
}

export function changeOpinion(state: GameState, a: KingdomId, b: KingdomId, amount: number): GameState {
  return updateRelation(state, a, b, (r) => ({ ...r, opinion: Math.max(-100, Math.min(100, r.opinion + amount)) }));
}

export function isAtWar(state: GameState, a: KingdomId, b: KingdomId): boolean {
  return getRelation(state, a, b)?.stance === 'war';
}

export function isAtWarWithAnyone(state: GameState, a: KingdomId): boolean {
  return state.relations.some((r) => (r.kingdomA === a || r.kingdomB === a) && r.stance === 'war');
}
