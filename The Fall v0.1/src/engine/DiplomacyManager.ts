import type { GameState } from '../types/game';
import type { KingdomId } from '../types/kingdom';
import { applyResourceDelta } from './ResourceManager';
import { changeOpinion, getRelation, updateRelation } from './relations';
import { addChronicle } from './chronicle';

/**
 * Basic but functional diplomacy (GDD §8). The player gets one diplomatic action
 * per rival per year; rivals answer based on strength, stability and opinion.
 */

export const TRUCE_YEARS = 5;

export type DiplomaticAction =
  | 'send_gifts'
  | 'propose_alliance'
  | 'demand_tribute'
  | 'threaten'
  | 'declare_war'
  | 'negotiate_peace';

export const DIPLOMATIC_ACTIONS: Record<DiplomaticAction, { label: string; description: string }> = {
  send_gifts: { label: 'Send gifts', description: '5 gold for +15 opinion.' },
  propose_alliance: { label: 'Propose alliance', description: 'Allies never attack each other. Needs opinion +25 and peace.' },
  demand_tribute: { label: 'Demand tribute', description: 'Works only if your army is half again as large as theirs.' },
  threaten: { label: 'Threaten', description: 'A show of force. An empty threat costs legitimacy.' },
  declare_war: { label: 'Declare war', description: 'Breaking a peace costs legitimacy; betraying an ally costs more.' },
  negotiate_peace: { label: 'Negotiate peace', description: `A ${TRUCE_YEARS}-year truce, if they are willing.` },
};

function setGold(state: GameState, id: KingdomId, delta: number): GameState {
  const k = state.kingdoms[id]!;
  return { ...state, kingdoms: { ...state.kingdoms, [id]: { ...k, resources: applyResourceDelta(k.resources, { gold: delta }) } } };
}

function setRes(state: GameState, id: KingdomId, delta: Parameters<typeof applyResourceDelta>[1]): GameState {
  const k = state.kingdoms[id]!;
  return { ...state, kingdoms: { ...state.kingdoms, [id]: { ...k, resources: applyResourceDelta(k.resources, delta) } } };
}

/** Ends a war: truce for `years`, both sides' sieges against each other are lifted and the armies return home. */
export function makePeace(state: GameState, a: KingdomId, b: KingdomId, years = TRUCE_YEARS): GameState {
  let s = updateRelation(state, a, b, (r) => ({ ...r, stance: 'truce', warSince: null, truceUntil: state.year + years }));
  for (const siege of state.sieges) {
    const owner = state.provinces[siege.provinceId]?.ownerId;
    const between = (siege.attackerId === a && owner === b) || (siege.attackerId === b && owner === a);
    if (!between) continue;
    s = { ...s, sieges: s.sieges.filter((x) => x.id !== siege.id) };
    s = setRes(s, siege.attackerId, { military: siege.army });
  }
  return addChronicle(s, 'diplomacy', `${s.kingdoms[a]!.shortName} and ${s.kingdoms[b]!.shortName} agree a truce until ${state.year + years}.`);
}

export function declareWar(state: GameState, a: KingdomId, b: KingdomId): GameState {
  const relation = getRelation(state, a, b);
  if (!relation || relation.stance === 'war') return state;
  const betrayal = relation.stance === 'alliance' || relation.stance === 'truce';
  let s = updateRelation(state, a, b, (r) => ({
    ...r,
    stance: 'war',
    warSince: state.year,
    truceUntil: null,
    opinion: Math.max(-100, r.opinion - (betrayal ? 50 : 30)),
  }));
  s = setRes(s, a, { legitimacy: betrayal ? -8 : -3 });
  return addChronicle(s, 'diplomacy', `${s.kingdoms[a]!.shortName} declares war on ${s.kingdoms[b]!.shortName}${betrayal ? ', breaking its word' : ''}.`);
}

/** How willing `them` is to make peace with `us` (≥ 1 accepts). */
export function peaceWillingness(state: GameState, us: KingdomId, them: KingdomId): number {
  const u = state.kingdoms[us]!.resources;
  const t = state.kingdoms[them]!.resources;
  const relation = getRelation(state, us, them);
  const years = relation?.warSince !== null && relation?.warSince !== undefined ? state.year - relation.warSince : 0;
  let score = u.military / Math.max(1, t.military);
  if (t.stability < 35) score += 0.4;
  if (t.food < 10 || t.gold < 5) score += 0.3;
  if (years >= 3) score += 0.3;
  return score;
}

export type DiplomacyCheck = { ok: true } | { ok: false; reason: string };

export function checkDiplomacy(state: GameState, target: KingdomId, action: DiplomaticAction): DiplomacyCheck {
  const player = state.kingdoms[state.playerKingdomId]!;
  const k = state.kingdoms[target];
  const relation = getRelation(state, player.id, target);
  if (!k || k.isPlayer || !relation) return { ok: false, reason: 'Unknown kingdom.' };
  if (state.status !== 'ongoing') return { ok: false, reason: 'The campaign has ended.' };
  if (k.isEliminated) return { ok: false, reason: 'That kingdom has fallen.' };
  if (relation.lastActionYear === state.year) return { ok: false, reason: 'Your envoys already spoke with them this year.' };
  switch (action) {
    case 'send_gifts':
      return player.resources.gold >= 5 ? { ok: true } : { ok: false, reason: 'Not enough gold.' };
    case 'propose_alliance':
      if (relation.stance === 'alliance') return { ok: false, reason: 'Already allied.' };
      if (relation.stance === 'war') return { ok: false, reason: 'Make peace first.' };
      return { ok: true };
    case 'demand_tribute':
    case 'threaten':
      if (relation.stance === 'alliance') return { ok: false, reason: 'Not toward an ally.' };
      return { ok: true };
    case 'declare_war':
      return relation.stance === 'war' ? { ok: false, reason: 'Already at war.' } : { ok: true };
    case 'negotiate_peace':
      return relation.stance === 'war' ? { ok: true } : { ok: false, reason: 'You are not at war.' };
  }
}

/** Performs a player diplomatic action and records the answer in the chronicle. */
export function performDiplomacy(state: GameState, target: KingdomId, action: DiplomaticAction): GameState {
  if (!checkDiplomacy(state, target, action).ok) return state;
  const me = state.playerKingdomId;
  const them = state.kingdoms[target]!;
  const myMil = state.kingdoms[me]!.resources.military;
  let s = updateRelation(state, me, target, (r) => ({ ...r, lastActionYear: state.year }));
  const relation = getRelation(s, me, target)!;
  const say = (msg: string) => (s = addChronicle(s, 'diplomacy', msg));

  switch (action) {
    case 'send_gifts':
      s = setGold(s, me, -5);
      s = setGold(s, target, 5);
      s = changeOpinion(s, me, target, 15);
      say(`Gifts sent to ${them.shortName}. They are pleased.`);
      break;
    case 'propose_alliance':
      if (relation.opinion >= 25) {
        s = updateRelation(s, me, target, (r) => ({ ...r, stance: 'alliance', truceUntil: null }));
        say(`${them.shortName} accepts an alliance with Ardenhal.`);
      } else {
        s = changeOpinion(s, me, target, -5);
        say(`${them.shortName} rejects the alliance. They do not trust you enough.`);
      }
      break;
    case 'demand_tribute':
      if (myMil >= them.resources.military * 1.5) {
        const amount = Math.min(10, them.resources.gold);
        s = setGold(s, target, -amount);
        s = setGold(s, me, amount);
        s = changeOpinion(s, me, target, -20);
        say(`${them.shortName} pays ${amount} gold in tribute, seething.`);
      } else {
        s = changeOpinion(s, me, target, -10);
        say(`${them.shortName} laughs at your demand for tribute.`);
      }
      break;
    case 'threaten':
      if (myMil >= them.resources.military * 1.2) {
        const amount = Math.min(5, them.resources.gold);
        s = setGold(s, target, -amount);
        s = setGold(s, me, amount);
        s = changeOpinion(s, me, target, -15);
        say(`${them.shortName} yields ${amount} gold rather than risk your wrath.`);
      } else {
        s = changeOpinion(s, me, target, -10);
        s = setRes(s, me, { legitimacy: -1 });
        say(`${them.shortName} calls your bluff. The court whispers about empty threats.`);
      }
      break;
    case 'declare_war':
      s = declareWar(s, me, target);
      break;
    case 'negotiate_peace': {
      const will = peaceWillingness(s, me, target);
      if (will >= 1) {
        s = makePeace(s, me, target);
      } else if (will >= 0.7 && s.kingdoms[me]!.resources.gold >= 10) {
        s = setGold(s, me, -10);
        s = setGold(s, target, 10);
        s = makePeace(s, me, target);
        say(`Peace with ${them.shortName} cost 10 gold in reparations.`);
      } else {
        say(`${them.shortName} refuses peace. They believe they are winning.`);
      }
      break;
    }
  }
  return s;
}

/** Yearly drift: opinions cool toward neutral, wars breed hatred, truces expire. */
export function updateRelationsYearly(state: GameState): GameState {
  let s = state;
  const relations = s.relations.map((r) => {
    let opinion = r.opinion;
    if (r.stance === 'war') opinion -= 2;
    else if (opinion > 0) opinion = Math.max(0, opinion - 2);
    else if (opinion < 0) opinion = Math.min(0, opinion + 2);
    let stance = r.stance;
    let truceUntil = r.truceUntil;
    if (r.stance === 'truce' && r.truceUntil !== null && state.year > r.truceUntil) {
      stance = 'peace';
      truceUntil = null;
    }
    return { ...r, opinion: Math.max(-100, Math.min(100, opinion)), stance, truceUntil };
  });
  s = { ...s, relations };
  // Wars with an eliminated kingdom end.
  for (const r of s.relations) {
    if (r.stance === 'war' && (s.kingdoms[r.kingdomA]?.isEliminated || s.kingdoms[r.kingdomB]?.isEliminated)) {
      s = updateRelation(s, r.kingdomA, r.kingdomB, (x) => ({ ...x, stance: 'peace', warSince: null }));
    }
  }
  return s;
}
