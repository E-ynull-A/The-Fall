import type { GameState } from '../types/game';
import type { Kingdom, KingdomId } from '../types/kingdom';
import type { Province } from '../types/province';
import type { Tactic } from '../types/military';
import { computeEconomy } from './EconomyManager';
import { checkProvinceAction, checkRecruit, performProvinceAction, recruit, setTaxLevel } from './ProvinceManager';
import { assaultSiege, attack, attackableProvinces, estimateBattle, liftSiege } from './CombatManager';
import { applyResourceDelta } from './ResourceManager';
import { getRelation } from './relations';
import { makePeace, peaceWillingness } from './DiplomacyManager';
import { queueEvent } from './EventManager';
import { getProvincesOwnedBy } from './selectors';

/**
 * AI kingdoms (GDD §8). Each AI decides from its own situation, in priority order:
 *   1. Survive: fix famine and bankruptcy, calm unrest.
 *   2. Make peace when a war is going badly.
 *   3. Keep an army sized to its ambitions.
 *   4. Expand when strong enough — expansionists more readily than cautious realms.
 * The AI uses the same engine functions and rules as the player.
 */

interface Personality {
  /** Army size target per owned province. */
  armyPerProvince: number;
  /** Minimum chance of victory before attacking. */
  attackThreshold: number;
  /** Will break a peace only if its opinion of the target is at or below this. */
  breakPeaceOpinion: number;
  /** Share of the field army it commits to an attack. */
  commitShare: number;
}

const PERSONALITIES: Record<Kingdom['personality'], Personality> = {
  expansionist: { armyPerProvince: 7, attackThreshold: 0.7, breakPeaceOpinion: -10, commitShare: 0.7 },
  mercantile: { armyPerProvince: 5, attackThreshold: 0.85, breakPeaceOpinion: -60, commitShare: 0.6 },
  cautious: { armyPerProvince: 5, attackThreshold: 0.9, breakPeaceOpinion: -80, commitShare: 0.5 },
};

/** AI holds off unprovoked wars for the first years so the player can find their feet. */
export const AI_GRACE_YEARS = 3;
/** Years an AI waits after a conquest before launching a new attack. */
export const AI_CONSOLIDATION_YEARS = 4;

function res(state: GameState, id: KingdomId) {
  return state.kingdoms[id]!.resources;
}

function setRes(state: GameState, id: KingdomId, delta: Parameters<typeof applyResourceDelta>[1]): GameState {
  const k = state.kingdoms[id]!;
  return { ...state, kingdoms: { ...state.kingdoms, [id]: { ...k, resources: applyResourceDelta(k.resources, delta) } } };
}

function manageEconomy(state: GameState, id: KingdomId): GameState {
  let s = state;
  const owned = () => getProvincesOwnedBy(s, id);
  let econ = computeEconomy(s, id);

  // Tax policy: squeeze stable provinces when broke, relieve restless ones.
  for (const p of owned()) {
    if (p.stability < 30 && p.taxLevel !== 'low') s = setTaxLevel(s, p.id, 'low', id);
    else if (p.stability >= 30 && p.stability < 50 && p.taxLevel === 'low') s = setTaxLevel(s, p.id, 'normal', id);
    else if (econ.netGold < 0 && res(s, id).gold < 15 && p.stability >= 55 && p.taxLevel === 'normal')
      s = setTaxLevel(s, p.id, 'high', id);
    else if (p.taxLevel === 'high' && p.stability < 45) s = setTaxLevel(s, p.id, 'normal', id);
  }
  econ = computeEconomy(s, id);

  // Food: improve farms, buy grain, or shed soldiers before famine strikes.
  const foodYearsLeft = econ.netFood < 0 ? res(s, id).food / -econ.netFood : Infinity;
  if (foodYearsLeft < 3) {
    const farm = owned()
      .filter((p) => checkProvinceAction(s, p.id, 'improve_food', id).ok)
      .sort((a, b) => a.foodProduction - b.foodProduction)[0];
    if (farm) s = performProvinceAction(s, farm.id, 'improve_food', id);
    if (res(s, id).gold >= 12) s = setRes(s, id, { gold: -8, food: 6 });
    econ = computeEconomy(s, id);
    if (econ.netFood < 0 && res(s, id).food < -econ.netFood * 2) {
      const disband = Math.ceil(res(s, id).military * 0.15);
      if (disband > 0) s = setRes(s, id, { military: -disband });
    }
  }

  // Bankruptcy: disband before the army deserts on its own.
  econ = computeEconomy(s, id);
  if (econ.unpaidGold > 0) {
    const disband = Math.min(res(s, id).military, econ.unpaidGold * 5);
    if (disband > 0) s = setRes(s, id, { military: -disband });
  }

  // Unrest: put down the worst province.
  const worst = owned().sort((a, b) => a.stability - b.stability)[0];
  if (worst && worst.stability < 25 && checkProvinceAction(s, worst.id, 'suppress_unrest', id).ok) {
    s = performProvinceAction(s, worst.id, 'suppress_unrest', id);
  }
  return s;
}

/** A rich AI invests: infrastructure first, then walls on threatened frontiers. */
function manageInvestment(state: GameState, id: KingdomId): GameState {
  let s = state;
  for (let i = 0; i < 2 && res(s, id).gold > 35; i++) {
    const owned = getProvincesOwnedBy(s, id);
    const threatened = owned
      .filter((p) =>
        p.neighbors.some((n) => {
          const owner = s.provinces[n]?.ownerId;
          if (!owner || owner === id) return false;
          const r = getRelation(s, id, owner);
          return r !== undefined && (r.stance === 'war' || r.opinion < -20);
        }),
      )
      .filter((p) => checkProvinceAction(s, p.id, 'build_defenses', id).ok)
      .sort((a, b) => a.fortification - b.fortification)[0];
    if (threatened && threatened.fortification < 2) {
      s = performProvinceAction(s, threatened.id, 'build_defenses', id);
      continue;
    }
    const develop = owned
      .filter((p) => checkProvinceAction(s, p.id, 'develop_infrastructure', id).ok)
      .sort((a, b) => a.development - b.development)[0];
    if (develop) s = performProvinceAction(s, develop.id, 'develop_infrastructure', id);
    else break;
  }
  return s;
}

function manageArmy(state: GameState, id: KingdomId, personality: Personality): GameState {
  let s = state;
  const provinces = getProvincesOwnedBy(s, id);
  // Wealth buys a larger army.
  const target = provinces.length * personality.armyPerProvince + Math.floor(Math.max(0, res(s, id).gold - 30) / 10);
  if (res(s, id).military >= target) return s;
  const econ = computeEconomy(s, id);
  // Only recruit what the treasury can keep paying for.
  if (econ.netGold < -2 && res(s, id).gold < 20) return s;
  for (const p of [...provinces].sort((a, b) => b.recruitmentPotential - a.recruitmentPotential)) {
    const need = target - res(s, id).military;
    if (need <= 0) break;
    const affordable = Math.floor((res(s, id).gold - 8) / 2);
    const amount = Math.min(need, p.recruitmentPotential, affordable, Math.floor(res(s, id).food / 2));
    if (amount < 1 || p.stability < 30) continue;
    if (checkRecruit(s, p.id, amount, id).ok) s = recruit(s, p.id, amount, id);
  }
  return s;
}

function manageWar(state: GameState, id: KingdomId, personality: Personality): GameState {
  let s = state;
  const me = s.kingdoms[id]!;

  // Ongoing sieges: assault when the odds are good, give up when the army withers.
  for (const siege of s.sieges.filter((x) => x.attackerId === id)) {
    const p = s.provinces[siege.provinceId]!;
    const walls = Math.max(0, p.fortification - siege.progress);
    const est = estimateBattle(s, id, p.id, siege.army, 'aggressive', walls, siege.bonus);
    if (est.chance >= 0.7) s = assaultSiege(s, siege.id, 'aggressive').state;
    else if (siege.army < 3) s = liftSiege(s, siege.id);
  }

  // Peace when the war goes badly.
  for (const r of s.relations) {
    if (r.stance !== 'war' || (r.kingdomA !== id && r.kingdomB !== id)) continue;
    const other = r.kingdomA === id ? r.kingdomB : r.kingdomA;
    const theirWill = peaceWillingness(s, other, id); // how much *we* want out
    const weAreLosing = theirWill >= 1.2 || res(s, id).stability < 30 || res(s, id).food < 5;
    if (!weAreLosing) continue;
    if (s.kingdoms[other]!.isPlayer) {
      if (!s.activeEvents.some((e) => e.definitionId === 'peace_envoy' && e.targetKingdomId === id)) {
        s = queueEvent(s, 'peace_envoy', id);
      }
    } else if (peaceWillingness(s, id, other) >= 0.8) {
      s = makePeace(s, id, other);
    }
  }

  // Expansion: at most one new attack per year, and time to absorb each conquest.
  if (res(s, id).stability < 30 || res(s, id).food < 5) return s;
  const lastConquest = s.battles.filter((b) => b.attackerId === id && b.captured).at(-1);
  if (lastConquest && s.year - lastConquest.year < AI_CONSOLIDATION_YEARS) return s;
  const field = res(s, id).military;
  const commit = Math.floor(field * personality.commitShare);
  if (commit < 4) return s;

  let best: { p: Province; chance: number; score: number } | null = null;
  for (const p of attackableProvinces(s, id)) {
    const relation = getRelation(s, id, p.ownerId);
    if (!relation || relation.stance === 'alliance' || relation.stance === 'truce') continue;
    if (s.sieges.some((x) => x.provinceId === p.id)) continue;
    if (relation.stance !== 'war') {
      const grace = s.year - s.startYear < AI_GRACE_YEARS;
      // Hunger drives even a reluctant realm to war.
      const desperate = me.personality === 'expansionist' && res(s, id).food < 10;
      if (grace || (relation.opinion > personality.breakPeaceOpinion && !desperate)) continue;
    }
    const fortified = p.fortification >= 2;
    // For fortified targets, judge by what the walls will be after a couple of years.
    const est = estimateBattle(s, id, p.id, commit, 'balanced', fortified ? Math.max(0, p.fortification - 2) : undefined);
    if (est.chance < personality.attackThreshold) continue;
    const value = p.taxIncome + p.foodProduction * (res(s, id).food < 20 ? 1.5 : 0.5) + (p.historicalOwnerId === id ? 3 : 0) + (p.isCapital ? 4 : 0);
    const score = value * est.chance;
    if (!best || score > best.score) best = { p, chance: est.chance, score };
  }
  if (best) {
    const tactic: Tactic = best.chance < 0.85 ? 'aggressive' : 'balanced';
    s = attack(s, id, best.p.id, commit, tactic).state;
  }

  // Tribute demands: a much stronger rival leans on the player.
  const player = s.kingdoms[s.playerKingdomId]!;
  const relation = getRelation(s, id, player.id);
  if (
    relation &&
    relation.stance === 'peace' &&
    relation.opinion <= -20 &&
    me.personality === 'expansionist' &&
    res(s, id).military >= player.resources.military * 1.8 &&
    s.year - (s.eventHistory['tribute_demand'] ?? -99) >= 5 &&
    s.year - s.startYear >= AI_GRACE_YEARS
  ) {
    s = queueEvent(s, 'tribute_demand', id);
  }
  return s;
}

/** Runs one AI kingdom's yearly decisions. */
export function runAI(state: GameState, id: KingdomId): GameState {
  const k = state.kingdoms[id];
  if (!k || k.isPlayer || k.isEliminated || state.status !== 'ongoing') return state;
  const personality = PERSONALITIES[k.personality];
  let s = manageEconomy(state, id);
  s = manageArmy(s, id, personality);
  s = manageInvestment(s, id);
  s = manageWar(s, id, personality);
  return s;
}

/** World phase for every AI kingdom. */
export function runAllAI(state: GameState): GameState {
  let s = state;
  for (const k of Object.values(state.kingdoms)) {
    if (!k.isPlayer) s = runAI(s, k.id);
  }
  return s;
}

