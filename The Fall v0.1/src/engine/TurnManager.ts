import type { GameState } from '../types/game';
import type { ResourceDelta } from '../types/kingdom';
import type { YearReport } from '../types/economy';
import { applyEconomy, type EconomyOutcome } from './EconomyManager';
import { applyResourceDelta, RESOURCE_KEYS } from './ResourceManager';
import { refillHand } from './CardManager';
import { getObjectiveDefinition, updateObjectivesAtYearEnd } from './ObjectiveManager';
import { applyEffects } from './EffectManager';
import { addChronicle } from './chronicle';
import { getProvincesOwnedBy } from './selectors';
import { advanceSieges } from './CombatManager';
import { runAllAI } from './AIManager';
import { updateRelationsYearly } from './DiplomacyManager';
import { generateYearlyEvents } from './EventManager';

/**
 * Yearly turn sequence (GDD §5).
 *
 *   END_YEAR closes the current year and opens the next:
 *     Phase 3  Military actions        – Phase 5 of development (not yet)
 *     Phase 4  World events and AI     – Phase 6 of development (not yet)
 *     Phase 5  End of year             – delayed effects, objectives, defeat check
 *     → advance year
 *     Phase 1  Start of year           – economy for every kingdom, draw cards
 *     Phase 2  Player decisions        – the player acts until the next END_YEAR
 *
 * `lastResolvedYear` guarantees the start-of-year economy runs exactly once per year.
 */

function formatDelta(delta: ResourceDelta): string {
  const parts = RESOURCE_KEYS.filter((k) => (delta[k] ?? 0) !== 0).map((k) => {
    const v = delta[k] as number;
    return `${v > 0 ? '+' : '−'}${Math.abs(v)} ${k}`;
  });
  return parts.length ? parts.join(', ') : 'no change';
}

/** Applies delayed effects that fall due this year (to the player). */
export function resolveDelayedEffects(state: GameState): GameState {
  const due = state.delayedEffects.filter((e) => e.triggerYear <= state.year);
  if (due.length === 0) return state;
  const player = state.kingdoms[state.playerKingdomId]!;
  let resources = player.resources;
  let next: GameState = state;
  for (const effect of due) {
    resources = applyResourceDelta(resources, effect.delta);
    next = addChronicle(next, 'event', effect.description);
  }
  return {
    ...next,
    delayedEffects: state.delayedEffects.filter((e) => e.triggerYear > state.year),
    kingdoms: { ...next.kingdoms, [player.id]: { ...player, resources } },
  };
}

/** Applies an objective's reward and decides whether it wins the campaign or scenario. */
export function fulfilObjective(state: GameState, objectiveId: string): GameState {
  const def = getObjectiveDefinition(objectiveId);
  let s = applyEffects(state, def.rewardEffects, { actorId: state.playerKingdomId });
  s = addChronicle(s, 'system', `Ambition fulfilled: ${def.name}. ${def.reward}`);
  const scenarioGoal = s.scenario !== null && def.scenarioOnly;
  if (def.endsCampaign || scenarioGoal) {
    s = addChronicle({ ...s, status: 'victory' }, 'system', 'Victory! The chroniclers will sing of this reign.');
  }
  // Celebrate the primary objective (or any campaign-ending one).
  if (objectiveId === s.primaryObjectiveId || def.endsCampaign || scenarioGoal) s = { ...s, pendingTriumph: objectiveId };
  return s;
}

/** Returns a defeated state if any defeat condition holds (GDD §11). */
export function checkDefeat(state: GameState): GameState {
  if (state.status !== 'ongoing') return state;
  const player = state.kingdoms[state.playerKingdomId]!;
  let reason: string | null = null;
  if (getProvincesOwnedBy(state, player.id).length === 0) reason = 'Every province of Ardenhal has been lost.';
  else if (state.provinces[player.capitalProvinceId]?.ownerId !== player.id) reason = 'The capital has fallen.';
  else if (player.resources.stability <= 0) reason = 'Order has collapsed. The realm tears itself apart.';
  else if (player.resources.legitimacy <= 0) reason = 'No one recognises your crown any longer. You are deposed.';
  else if (state.crisisYears >= 2) reason = 'Bankrupt, starving and torn by unrest, the realm simply ceases to function.';
  else if (state.scenario && state.year > state.scenario.lastYear) reason = 'Time has run out. The scenario’s goal was not achieved.';
  if (!reason) return state;
  return addChronicle({ ...state, status: 'defeat', defeatReason: reason }, 'system', `The Fall: ${reason}`);
}

/**
 * Start of year (GDD §5 Phase 1). Runs the economy for every surviving kingdom and refills
 * the player's hand. Does nothing if this year has already been resolved.
 */
export function resolveStartOfYear(state: GameState): { state: GameState; playerOutcome: EconomyOutcome | null } {
  if (state.lastResolvedYear === state.year) return { state, playerOutcome: null };

  let next: GameState = { ...state, phase: 'start_of_year' };
  let playerOutcome: EconomyOutcome | null = null;
  for (const kingdom of Object.values(state.kingdoms)) {
    if (kingdom.isEliminated) continue;
    const outcome = applyEconomy(next, kingdom.id);
    next = outcome.state;
    if (kingdom.id === state.playerKingdomId) playerOutcome = outcome;
  }

  const drawn = refillHand(next.deck, next.rngState);
  next = {
    ...next,
    deck: drawn.deck,
    rngState: drawn.rngState,
    lastResolvedYear: state.year,
    phase: 'decisions',
    cardsPlayedThisYear: 0,
  };
  return { state: next, playerOutcome };
}

/** The End Year action: resolves the rest of this year and the start of the next. */
export function endYear(state: GameState): GameState {
  if (state.status !== 'ongoing') return state;
  // Pending events must be answered first.
  if (state.activeEvents.length > 0) return state;
  const knownEntries = new Set(state.chronicle.map((c) => c.id));
  const before = state.kingdoms[state.playerKingdomId]!.resources;
  const closingYear = state.year;

  // Phase 3: military operations — sieges grind on.
  let s: GameState = { ...state, phase: 'military' };
  s = advanceSieges(s);

  // Phase 4: world events and AI.
  s = { ...s, phase: 'world' };
  s = runAllAI(s);
  s = updateRelationsYearly(s);
  s = generateYearlyEvents(s);

  // Phase 5: end of year.
  s = { ...s, phase: 'end_of_year' };
  const famineThisYear = s.lastYearReport?.year === closingYear ? s.lastYearReport.famine : false;
  const objectives = updateObjectivesAtYearEnd(s, famineThisYear);
  s = objectives.state;
  for (const id of objectives.completed) s = fulfilObjective(s, id);
  for (const name of objectives.failed) s = addChronicle(s, 'system', `Ambition failed: ${name}.`);
  s = checkDefeat(s);
  if (s.status !== 'ongoing') return { ...s, phase: 'end_of_year' };
  // A scenario that runs out of time ends here.
  if (s.scenario && closingYear >= s.scenario.lastYear) return checkDefeat({ ...s, year: closingYear + 1 });

  // Advance the campaign year, then Phase 1: start of the new year.
  s = { ...s, year: closingYear + 1 };
  // Consequences that fall due this new year (delayed event effects).
  s = resolveDelayedEffects(s);
  const start = resolveStartOfYear(s);
  s = start.state;
  const pr = s.kingdoms[s.playerKingdomId]!.resources;
  const collapse = pr.gold === 0 && pr.food === 0 && pr.stability < 15;
  s = { ...s, crisisYears: collapse ? s.crisisYears + 1 : 0 };

  const after = s.kingdoms[s.playerKingdomId]!.resources;
  const resourceChange: ResourceDelta = {};
  for (const k of RESOURCE_KEYS) {
    if (after[k] !== before[k]) resourceChange[k] = after[k] - before[k];
  }

  if (start.playerOutcome) {
    const report: YearReport = {
      year: s.year,
      economy: start.playerOutcome.breakdown,
      famine: start.playerOutcome.famine,
      unpaidArmy: start.playerOutcome.unpaidArmy,
      resourceChange,
      notes: start.playerOutcome.notes,
      worldNotes: s.chronicle
        .filter((c) => !knownEntries.has(c.id) && (c.kind === 'battle' || c.kind === 'diplomacy' || c.kind === 'event'))
        .map((c) => c.message),
    };
    s = { ...s, lastYearReport: report };
    s = addChronicle(s, 'turn', `The year ${s.year} begins: ${formatDelta(resourceChange)}.`);
    for (const note of report.notes) s = addChronicle(s, 'turn', note);
  }

  return checkDefeat(s);
}
