import type { GameState } from '../types/game';
import type { KingdomId } from '../types/kingdom';
import type { Province, ProvinceId } from '../types/province';
import type { BattleReport, Siege, Tactic } from '../types/military';
import { FLANKING_PENALTY, MILITARY, OPEN_TERRAIN, RETREAT_LOSS, TACTICS, TERRAIN_DEFENSE, TRAIT_DEFENSE } from '../data/military/militaryRules';
import { applyResourceDelta, clampResource } from './ResourceManager';
import { getRelation, updateRelation } from './relations';
import { getProvincesOwnedBy } from './selectors';
import { addChronicle } from './chronicle';
import { nextRandom } from '../utils/random';

/**
 * Hybrid combat (GDD §7). Generic over attacker and defender so the AI uses the same rules.
 */

export type AttackCheck = { ok: true; startsSiege: boolean; breaksPeace: boolean } | { ok: false; reason: string };

export function attackableProvinces(state: GameState, attackerId: KingdomId): Province[] {
  const owned = new Set(getProvincesOwnedBy(state, attackerId).map((p) => p.id));
  return Object.values(state.provinces).filter(
    (p) => p.ownerId !== attackerId && p.neighbors.some((n) => owned.has(n)),
  );
}

export function checkAttack(state: GameState, attackerId: KingdomId, provinceId: ProvinceId, committed: number): AttackCheck {
  const attacker = state.kingdoms[attackerId];
  const target = state.provinces[provinceId];
  if (!attacker || !target) return { ok: false, reason: 'Unknown target.' };
  if (state.status !== 'ongoing') return { ok: false, reason: 'The campaign has ended.' };
  if (target.ownerId === attackerId) return { ok: false, reason: 'You already hold this province.' };
  const relation = getRelation(state, attackerId, target.ownerId);
  if (relation?.stance === 'alliance') return { ok: false, reason: 'You are allied with its owner. Break the alliance first.' };
  if (relation?.stance === 'truce') return { ok: false, reason: 'A truce is in force with its owner.' };
  if (!attackableProvinces(state, attackerId).some((p) => p.id === provinceId)) {
    return { ok: false, reason: 'Not connected to your territory.' };
  }
  if (state.sieges.some((s) => s.provinceId === provinceId)) return { ok: false, reason: 'Already under siege.' };
  if (!Number.isInteger(committed) || committed < 1) return { ok: false, reason: 'Commit at least 1 strength.' };
  if (committed > attacker.resources.military) return { ok: false, reason: 'You do not have that many troops.' };
  return {
    ok: true,
    startsSiege: target.fortification >= MILITARY.siegeFortification,
    breaksPeace: relation?.stance !== 'war',
  };
}

function tacticAttack(tactic: Tactic, target: Province): number {
  if (tactic === 'flanking') return OPEN_TERRAIN.includes(target.type) ? TACTICS.flanking.attack : FLANKING_PENALTY;
  return TACTICS[tactic].attack;
}

/** Defender strength before random rolls. */
export function defenderStrength(state: GameState, provinceId: ProvinceId, fortification?: number): number {
  const p = state.provinces[provinceId]!;
  const owner = state.kingdoms[p.ownerId]!;
  const fort = fortification ?? p.fortification;
  const troops = p.garrison * MILITARY.garrisonStrength + owner.resources.military * MILITARY.defenderFieldSupport;
  const traits = p.traits.reduce((m, t) => m * (TRAIT_DEFENSE[t] ?? 1), 1);
  return troops * TERRAIN_DEFENSE[p.type] * traits * (1 + MILITARY.fortificationBonus * fort);
}

export function attackerStrength(state: GameState, attackerId: KingdomId, committed: number, tactic: Tactic, provinceId: ProvinceId, siegeBonus = 0): number {
  const bonus = state.battleBonus[attackerId] ?? 0;
  return committed * tacticAttack(tactic, state.provinces[provinceId]!) * (1 + 0.1 * bonus) * (1 + 0.1 * siegeBonus);
}

/** Expected odds without dice; used to preview a battle and by the AI. */
export function estimateBattle(state: GameState, attackerId: KingdomId, provinceId: ProvinceId, committed: number, tactic: Tactic = 'balanced', fortification?: number, siegeBonus = 0) {
  const attack = attackerStrength(state, attackerId, committed, tactic, provinceId, siegeBonus);
  const defense = defenderStrength(state, provinceId, fortification);
  const ratio = attack / Math.max(0.1, defense);
  // Both sides roll ±15%: a ratio above 1.35 always wins, below 0.74 always loses.
  const lo = MILITARY.rollMin / MILITARY.rollMax;
  const hi = MILITARY.rollMax / MILITARY.rollMin;
  const chance = ratio >= hi ? 1 : ratio <= lo ? 0 : (ratio - lo) / (hi - lo);
  return { attack, defense, ratio, chance };
}

/** "Important" battles let the player choose a tactic (GDD §7.3). */
export function isImportantBattle(state: GameState, attackerId: KingdomId, provinceId: ProvinceId, committed: number): boolean {
  const p = state.provinces[provinceId];
  if (!p) return false;
  if (p.isCapital || p.fortification >= MILITARY.siegeFortification) return true;
  const { ratio } = estimateBattle(state, attackerId, provinceId, committed);
  return ratio > 0.6 && ratio < 1.6;
}

function setResources(state: GameState, id: KingdomId, delta: Parameters<typeof applyResourceDelta>[1]): GameState {
  const k = state.kingdoms[id]!;
  return { ...state, kingdoms: { ...state.kingdoms, [id]: { ...k, resources: applyResourceDelta(k.resources, delta) } } };
}

/** Declares war if needed. Breaking a peace costs legitimacy and goodwill. */
function ensureWar(state: GameState, attackerId: KingdomId, defenderId: KingdomId): GameState {
  const relation = getRelation(state, attackerId, defenderId);
  if (!relation || relation.stance === 'war') return state;
  let s = updateRelation(state, attackerId, defenderId, (r) => ({
    ...r,
    stance: 'war',
    warSince: state.year,
    truceUntil: null,
    opinion: Math.max(-100, r.opinion - MILITARY.breakPeaceOpinion),
  }));
  s = setResources(s, attackerId, { legitimacy: -MILITARY.breakPeaceLegitimacy });
  return addChronicle(s, 'diplomacy', `${s.kingdoms[attackerId]!.shortName} declares war on ${s.kingdoms[defenderId]!.shortName}.`);
}

/** Transfers a province and applies post-conquest consequences (GDD §7.5). */
export function captureProvince(state: GameState, attackerId: KingdomId, provinceId: ProvinceId, survivors: number): { state: GameState; returning: number } {
  const p = state.provinces[provinceId]!;
  const defenderId = p.ownerId;
  const reclaimed = p.historicalOwnerId === attackerId;
  const garrison = Math.min(3, Math.max(1, Math.ceil(survivors * 0.2)));
  const returning = Math.max(0, survivors - garrison);

  let s: GameState = {
    ...state,
    provinces: {
      ...state.provinces,
      [provinceId]: {
        ...p,
        ownerId: attackerId,
        garrison: Math.min(garrison, survivors),
        stability: clampResource('stability', reclaimed ? MILITARY.reclaimedStability : MILITARY.conqueredStability),
        taxLevel: 'normal',
        conqueredYear: state.year,
        lastImprovedYear: null,
        lastRecruitedYear: null,
      },
    },
    sieges: state.sieges.filter((x) => x.provinceId !== provinceId),
  };

  s = setResources(s, defenderId, { legitimacy: -MILITARY.loseProvinceLegitimacy });
  if (p.isCapital && s.kingdoms[defenderId]?.capitalProvinceId === provinceId) {
    s = setResources(s, defenderId, { legitimacy: -MILITARY.loseCapitalLegitimacy, stability: -MILITARY.loseCapitalStability });
    s = addChronicle(s, 'battle', `${s.kingdoms[defenderId]!.shortName} has lost its capital, ${p.name}!`);
  }
  if (reclaimed) s = setResources(s, attackerId, { legitimacy: MILITARY.reclaimLegitimacy });

  if (getProvincesOwnedBy(s, defenderId).length === 0) {
    const d = s.kingdoms[defenderId]!;
    s = { ...s, kingdoms: { ...s.kingdoms, [defenderId]: { ...d, isEliminated: true } } };
    s = { ...s, sieges: s.sieges.filter((x) => x.attackerId !== defenderId) };
    s = addChronicle(s, 'battle', `The ${d.name} is no more.`);
  }
  return { state: s, returning };
}

interface BattleInput {
  attackerId: KingdomId;
  provinceId: ProvinceId;
  committed: number;
  tactic: Tactic;
  /** For assaults: remaining wall level and siege bonus. */
  fortification?: number;
  siegeBonus?: number;
}

/** Resolves a battle with dice. Committed troops must already be removed from the attacker's army. */
function fight(state: GameState, input: BattleInput): { state: GameState; report: BattleReport } {
  const { attackerId, provinceId, committed, tactic } = input;
  const p = state.provinces[provinceId]!;
  const defenderId = p.ownerId;
  const defender = state.kingdoms[defenderId]!;
  const info = TACTICS[tactic];
  let s = state;
  const notes: string[] = [];

  const base = (outcome: BattleReport['outcome']): BattleReport => ({
    id: `b${s.nextId}`,
    year: s.year,
    attackerId,
    defenderId,
    provinceId,
    tactic,
    committed,
    attackerPower: 0,
    defenderPower: 0,
    attackerLosses: 0,
    defenderLosses: 0,
    outcome,
    captured: false,
    notes,
  });

  if (tactic === 'retreat') {
    const lost = Math.ceil(committed * RETREAT_LOSS);
    s = setResources(s, attackerId, { military: committed - lost });
    notes.push(`The army withdrew in good order, losing ${lost}.`);
    return { state: s, report: { ...base('retreat'), attackerLosses: lost } };
  }

  const r1 = nextRandom(s.rngState);
  const r2 = nextRandom(r1.state);
  s = { ...s, rngState: r2.state };
  const roll = (v: number) => MILITARY.rollMin + (MILITARY.rollMax - MILITARY.rollMin) * v;
  const attackerPower = attackerStrength(s, attackerId, committed, tactic, provinceId, input.siegeBonus ?? 0) * roll(r1.value);
  const defenderPower = defenderStrength(s, provinceId, input.fortification) * roll(r2.value);
  const ratio = defenderPower / Math.max(0.1, attackerPower);
  const won = attackerPower > defenderPower;

  // The battle bonus is spent.
  if (s.battleBonus[attackerId]) s = { ...s, battleBonus: { ...s.battleBonus, [attackerId]: 0 } };

  const support = defender.resources.military * MILITARY.defenderFieldSupport;
  let attackerLosses: number;
  let defenderLosses: number;
  let fieldLosses: number;
  let garrisonLosses: number;

  if (won) {
    attackerLosses = Math.min(committed, Math.round(committed * 0.25 * Math.min(ratio, 1) * info.ownLosses));
    garrisonLosses = p.garrison;
    fieldLosses = Math.round(support * 0.5 * info.enemyLosses);
  } else {
    attackerLosses = Math.min(committed, Math.round(committed * (0.4 + 0.2 * Math.min(ratio, 2)) * info.ownLosses));
    const inflicted = ((p.garrison + support) * 0.3 * info.enemyLosses) / Math.max(1, ratio);
    garrisonLosses = Math.min(p.garrison, Math.round(inflicted * 0.6));
    fieldLosses = Math.round(inflicted * 0.4);
  }
  defenderLosses = garrisonLosses + fieldLosses;

  s = setResources(s, defenderId, { military: -fieldLosses });
  s = {
    ...s,
    provinces: { ...s.provinces, [provinceId]: { ...s.provinces[provinceId]!, garrison: Math.max(0, p.garrison - garrisonLosses) } },
  };

  const survivors = committed - attackerLosses;
  let captured = false;
  if (won) {
    const capture = captureProvince(s, attackerId, provinceId, survivors);
    s = setResources(capture.state, attackerId, { military: capture.returning });
    captured = true;
    notes.push(`${p.name} has fallen to ${s.kingdoms[attackerId]!.shortName}.`);
  } else {
    s = setResources(s, attackerId, { military: survivors });
    notes.push(`The attack on ${p.name} was thrown back.`);
  }

  const report: BattleReport = {
    ...base(won ? 'victory' : 'defeat'),
    attackerPower: Math.round(attackerPower * 10) / 10,
    defenderPower: Math.round(defenderPower * 10) / 10,
    attackerLosses,
    defenderLosses,
    captured,
  };
  return { state: s, report };
}

function recordBattle(state: GameState, report: BattleReport): GameState {
  const a = state.kingdoms[report.attackerId]!.shortName;
  const p = state.provinces[report.provinceId]!.name;
  const text =
    report.outcome === 'victory'
      ? `${a} takes ${p}. Losses: ${report.attackerLosses} attackers, ${report.defenderLosses} defenders.`
      : report.outcome === 'defeat'
        ? `${a} is repulsed at ${p}. Losses: ${report.attackerLosses} attackers, ${report.defenderLosses} defenders.`
        : report.outcome === 'retreat'
          ? `${a} withdraws from ${p}.`
          : `${a} lays siege to ${p}.`;
  const s = { ...state, battles: [...state.battles, report].slice(-30), nextId: state.nextId + 1 };
  return addChronicle(s, 'battle', text);
}

/**
 * Attack an adjacent province. Fortified provinces are besieged instead of stormed
 * (unless the attacker retreats). Returns the state and the battle report.
 */
export function attack(state: GameState, attackerId: KingdomId, provinceId: ProvinceId, committed: number, tactic: Tactic): { state: GameState; report: BattleReport | null } {
  const check = checkAttack(state, attackerId, provinceId, committed);
  if (!check.ok) return { state, report: null };
  const defenderId = state.provinces[provinceId]!.ownerId;
  let s = ensureWar(state, attackerId, defenderId);
  s = setResources(s, attackerId, { military: -committed });

  if (check.startsSiege && tactic !== 'retreat') {
    const siege: Siege = { id: `s${s.nextId}`, attackerId, provinceId, army: committed, startedYear: s.year, progress: 0, bonus: 0 };
    s = { ...s, sieges: [...s.sieges, siege], nextId: s.nextId + 1 };
    const report: BattleReport = {
      id: `b${s.nextId}`,
      year: s.year,
      attackerId,
      defenderId,
      provinceId,
      tactic,
      committed,
      attackerPower: 0,
      defenderPower: 0,
      attackerLosses: 0,
      defenderLosses: 0,
      outcome: 'siege_started',
      captured: false,
      notes: [`The walls are too strong to storm. A siege begins; each year wears them down.`],
    };
    return { state: recordBattle(s, report), report };
  }

  const result = fight(s, { attackerId, provinceId, committed, tactic });
  return { state: recordBattle(result.state, result.report), report: result.report };
}

/** Storms a besieged province. Every year of siege lowers the walls by one level. */
export function assaultSiege(state: GameState, siegeId: string, tactic: Tactic): { state: GameState; report: BattleReport | null } {
  const siege = state.sieges.find((x) => x.id === siegeId);
  if (!siege || state.status !== 'ongoing') return { state, report: null };
  const p = state.provinces[siege.provinceId]!;
  let s = { ...state, sieges: state.sieges.filter((x) => x.id !== siegeId) };
  const result = fight(s, {
    attackerId: siege.attackerId,
    provinceId: siege.provinceId,
    committed: siege.army,
    tactic,
    fortification: Math.max(0, p.fortification - siege.progress),
    siegeBonus: siege.bonus,
  });
  s = recordBattle(result.state, result.report);
  return { state: s, report: result.report };
}

export function liftSiege(state: GameState, siegeId: string): GameState {
  const siege = state.sieges.find((x) => x.id === siegeId);
  if (!siege) return state;
  let s = setResources({ ...state, sieges: state.sieges.filter((x) => x.id !== siegeId) }, siege.attackerId, { military: siege.army });
  s = addChronicle(s, 'battle', `The siege of ${state.provinces[siege.provinceId]!.name} is lifted.`);
  return s;
}

/**
 * Yearly siege progress (turn phase 3): walls wear down, both sides starve.
 * A province with no garrison left and no walls surrenders.
 */
export function advanceSieges(state: GameState): GameState {
  let s = state;
  for (const siege of state.sieges) {
    const p = s.provinces[siege.provinceId];
    if (!p || p.ownerId === siege.attackerId) {
      s = { ...s, sieges: s.sieges.filter((x) => x.id !== siege.id) };
      continue;
    }
    const attrition = Math.ceil(siege.army * MILITARY.siegeAttrition);
    const army = siege.army - attrition;
    const garrison = Math.max(0, p.garrison - 1);
    const progress = siege.progress + 1;
    s = { ...s, provinces: { ...s.provinces, [p.id]: { ...p, garrison } } };
    if (army <= 0) {
      s = addChronicle({ ...s, sieges: s.sieges.filter((x) => x.id !== siege.id) }, 'battle', `The siege of ${p.name} collapses.`);
      continue;
    }
    if (garrison === 0 && progress >= p.fortification) {
      s = { ...s, sieges: s.sieges.filter((x) => x.id !== siege.id) };
      const capture = captureProvince(s, siege.attackerId, p.id, army);
      s = setResources(capture.state, siege.attackerId, { military: capture.returning });
      s = addChronicle(s, 'battle', `Starving and without hope, ${p.name} surrenders to ${s.kingdoms[siege.attackerId]!.shortName}.`);
      continue;
    }
    s = { ...s, sieges: s.sieges.map((x) => (x.id === siege.id ? { ...x, army, progress } : x)) };
  }
  return s;
}
