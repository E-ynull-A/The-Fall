import type { GameState } from '../types/game';
import type { KingdomId } from '../types/kingdom';
import type { ActiveEvent, EventDefinition } from '../types/event';
import type { Province } from '../types/province';
import { EVENTS, EVENT_COOLDOWN, REBELLION_THRESHOLD, YEARLY_EVENT_CHANCE } from '../data/events/events';
import { applyEffects, checkCondition } from './EffectManager';
import { addChronicle } from './chronicle';
import { getProvincesOwnedBy } from './selectors';
import { nextRandom } from '../utils/random';

export function getEventDefinition(id: string): EventDefinition {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown event ${id}`);
  return e;
}

/** Fills {province} and {kingdom} placeholders. */
export function eventText(state: GameState, event: ActiveEvent, text: string): string {
  return text
    .replace('{province}', (event.targetProvinceId && state.provinces[event.targetProvinceId]?.name) || 'the realm')
    .replace('{kingdom}', (event.targetKingdomId && state.kingdoms[event.targetKingdomId]?.name) || 'a rival');
}

function pickProvince(state: GameState, def: EventDefinition, rng: number): { id?: string; rng: number } {
  const owned = getProvincesOwnedBy(state, state.playerKingdomId);
  let pool: Province[] = owned;
  if (def.provinceTarget === 'lowest_stability') {
    const lowest = [...owned].sort((a, b) => a.stability - b.stability)[0];
    return { id: lowest?.id, rng };
  }
  if (def.provinceTarget === 'random_fertile') pool = owned.filter((p) => p.type === 'fertile_lands');
  if (def.provinceTarget === 'random_coastal') pool = owned.filter((p) => p.type === 'coastal_port');
  if (!def.provinceTarget || pool.length === 0) return { rng };
  const r = nextRandom(rng);
  return { id: pool[Math.floor(r.value * pool.length)]?.id, rng: r.state };
}

/** Queues an event for the player. */
export function queueEvent(state: GameState, eventId: string, targetKingdomId?: KingdomId): GameState {
  const def = getEventDefinition(eventId);
  const picked = pickProvince(state, def, state.rngState);
  const event: ActiveEvent = {
    instanceId: `e${state.nextId}`,
    definitionId: eventId,
    year: state.year,
    targetProvinceId: picked.id,
    targetKingdomId,
  };
  return {
    ...state,
    rngState: picked.rng,
    nextId: state.nextId + 1,
    activeEvents: [...state.activeEvents, event],
    eventHistory: { ...state.eventHistory, [eventId]: state.year },
  };
}

/**
 * World phase: may raise a rebellion in a restless province and roll one random event
 * whose conditions hold for the player (GDD §9).
 */
export function generateYearlyEvents(state: GameState): GameState {
  let s = state;
  const player = s.playerKingdomId;

  // Rebellion: forced when a province is near breaking point.
  const restless = getProvincesOwnedBy(s, player).some((p) => p.stability < REBELLION_THRESHOLD);
  const lastRebellion = s.eventHistory['peasant_rebellion'] ?? -99;
  if (restless && s.year - lastRebellion >= 2) {
    s = queueEvent(s, 'peasant_rebellion');
  }

  const roll = nextRandom(s.rngState);
  s = { ...s, rngState: roll.state };
  if (roll.value > YEARLY_EVENT_CHANCE) return s;

  const eligible = EVENTS.filter(
    (e) =>
      e.weight > 0 &&
      s.year - (s.eventHistory[e.id] ?? -99) >= EVENT_COOLDOWN &&
      e.conditions.every((c) => checkCondition(s, player, c)),
  );
  const total = eligible.reduce((sum, e) => sum + e.weight, 0);
  if (total === 0) return s;
  const pick = nextRandom(s.rngState);
  s = { ...s, rngState: pick.state };
  let x = pick.value * total;
  for (const e of eligible) {
    x -= e.weight;
    if (x < 0) return queueEvent(s, e.id);
  }
  return s;
}

export type EventCheck = { ok: true } | { ok: false; reason: string };

export function checkEventChoice(state: GameState, instanceId: string, choiceId: string): EventCheck {
  const event = state.activeEvents.find((e) => e.instanceId === instanceId);
  if (!event) return { ok: false, reason: 'No such event.' };
  const def = getEventDefinition(event.definitionId);
  const choice = def.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'No such choice.' };
  // Choices may cost more than the treasury holds; costs are then simply clamped at zero.
  return { ok: true };
}

/** Applies the chosen option's immediate effects and schedules its delayed ones. */
export function resolveEvent(state: GameState, instanceId: string, choiceId: string): GameState {
  if (!checkEventChoice(state, instanceId, choiceId).ok) return state;
  const event = state.activeEvents.find((e) => e.instanceId === instanceId)!;
  const def = getEventDefinition(event.definitionId);
  const choice = def.choices.find((c) => c.id === choiceId)!;

  let s: GameState = { ...state, activeEvents: state.activeEvents.filter((e) => e.instanceId !== instanceId) };
  s = applyEffects(s, choice.effects, {
    actorId: s.playerKingdomId,
    targetProvinceId: event.targetProvinceId,
    targetKingdomId: event.targetKingdomId,
  });
  const delayed = choice.delayed.map((d, i) => ({
    id: `d${s.nextId}-${i}`,
    triggerYear: s.year + d.afterYears,
    delta: d.delta,
    description: d.description,
    sourceId: def.id,
  }));
  s = { ...s, delayedEffects: [...s.delayedEffects, ...delayed], nextId: s.nextId + 1 };
  return addChronicle(s, 'event', `${def.name}: ${choice.label}.`);
}
