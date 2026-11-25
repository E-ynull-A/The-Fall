import { createNewCampaign, gameReducer } from './GameEngine';
import { endYear } from './TurnManager';
import { runAI } from './AIManager';
import { generateYearlyEvents, queueEvent, resolveEvent } from './EventManager';
import { checkDiplomacy, makePeace, performDiplomacy } from './DiplomacyManager';
import { attack } from './CombatManager';
import { getRelation } from './relations';
import { validateGameState } from './validation';
import { advanceYear } from './testUtils';
import { EVENTS } from '../data/events/events';
import type { GameState } from '../types/game';

const fresh = (seed = 'world') => createNewCampaign({ seed });

describe('events', () => {
  it('has 10–15 events, each with at least two choices', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(10);
    expect(EVENTS.length).toBeLessThanOrEqual(15);
    for (const e of EVENTS) expect(e.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('blocks End Year until answered, then applies immediate effects', () => {
    const s = queueEvent(fresh(), 'corruption');
    expect(endYear(s)).toBe(s);
    const id = s.activeEvents[0]!.instanceId;
    const after = gameReducer(s, { type: 'RESOLVE_EVENT', instanceId: id, choiceId: 'audit' });
    expect(after.activeEvents).toHaveLength(0);
    expect(after.kingdoms['ardenhal']!.resources.gold).toBe(25);
    expect(endYear(after).year).toBe(s.year + 1);
  });

  it('schedules delayed consequences', () => {
    let s = queueEvent(fresh(), 'noble_conspiracy');
    s = resolveEvent(s, s.activeEvents[0]!.instanceId, 'ignore');
    expect(s.delayedEffects).toHaveLength(1);
    const legit = s.kingdoms['ardenhal']!.resources.legitimacy;
    const pending = (x: GameState) => x.delayedEffects.filter((d) => d.sourceId === 'noble_conspiracy').length;
    s = advanceYear(s); // year +1: not yet
    expect(pending(s)).toBe(1);
    s = advanceYear(s); // year +2: due
    expect(pending(s)).toBe(0);
    expect(s.kingdoms['ardenhal']!.resources.legitimacy).toBeLessThan(legit - 5);
  });

  it('targets a province when the event concerns one', () => {
    const s = queueEvent(fresh(), 'drought');
    const target = s.activeEvents[0]!.targetProvinceId!;
    expect(['thornfield', 'greenvale']).toContain(target);
  });

  it('raises a rebellion in a province near breaking point', () => {
    const s = structuredClone(fresh());
    s.provinces['thornfield']!.stability = 5;
    const out = generateYearlyEvents(s);
    const rebellion = out.activeEvents.find((e) => e.definitionId === 'peasant_rebellion');
    expect(rebellion?.targetProvinceId).toBe('thornfield');
  });

  it('only rolls events whose conditions hold', () => {
    let s = fresh('conditions');
    for (let i = 0; i < 25; i++) {
      s = generateYearlyEvents({ ...s, activeEvents: [] });
      for (const e of s.activeEvents) {
        if (e.definitionId === 'sea_raiders') throw new Error('Ardenhal owns no coast, raiders should not appear');
      }
      s = { ...s, year: s.year + 1 };
    }
  });
});

describe('diplomacy', () => {
  it('allows one action per rival per year', () => {
    const s = performDiplomacy(fresh(), 'saltmere', 'send_gifts');
    expect(getRelation(s, 'ardenhal', 'saltmere')!.opinion).toBe(-5);
    expect(checkDiplomacy(s, 'saltmere', 'propose_alliance')).toMatchObject({ ok: false });
    expect(checkDiplomacy(s, 'draven', 'propose_alliance').ok).toBe(true);
  });

  it('alliances need goodwill', () => {
    const refused = performDiplomacy(fresh(), 'saltmere', 'propose_alliance');
    expect(getRelation(refused, 'ardenhal', 'saltmere')!.stance).toBe('peace');
    const s = structuredClone(fresh());
    s.relations.find((r) => r.kingdomB === 'saltmere' && r.kingdomA === 'ardenhal')!.opinion = 40;
    const accepted = performDiplomacy(s, 'saltmere', 'propose_alliance');
    expect(getRelation(accepted, 'ardenhal', 'saltmere')!.stance).toBe('alliance');
  });

  it('tribute depends on relative strength', () => {
    const weak = performDiplomacy(fresh(), 'draven', 'demand_tribute');
    expect(weak.kingdoms['ardenhal']!.resources.gold).toBe(20);
    const s = structuredClone(fresh());
    s.kingdoms['ardenhal']!.resources.military = 60;
    const strong = performDiplomacy(s, 'draven', 'demand_tribute');
    expect(strong.kingdoms['ardenhal']!.resources.gold).toBe(30);
  });

  it('peace creates a truce that blocks attacks and lifts sieges', () => {
    let s = structuredClone(fresh());
    s.kingdoms['ardenhal']!.resources.military = 40;
    s = attack(s, 'ardenhal', 'draven_hold', 30, 'balanced').state;
    expect(s.sieges).toHaveLength(1);
    s = makePeace(s, 'ardenhal', 'draven');
    expect(s.sieges).toHaveLength(0);
    expect(s.kingdoms['ardenhal']!.resources.military).toBe(40);
    expect(getRelation(s, 'ardenhal', 'draven')!.stance).toBe('truce');
    expect(gameReducer(s, { type: 'ATTACK', provinceId: 'ironridge', committed: 5, tactic: 'balanced' })).toBe(s);
  });

  it('declaring war on an ally is a betrayal', () => {
    const s = structuredClone(fresh());
    s.relations = s.relations.map((r) => ({ ...r, stance: 'alliance' as const }));
    const out = performDiplomacy(s, 'draven', 'declare_war');
    expect(out.kingdoms['ardenhal']!.resources.legitimacy).toBe(32);
  });
});

describe('AI kingdoms', () => {
  it('act on their situation: a starving AI fixes its food', () => {
    const s = structuredClone(fresh());
    s.kingdoms['draven']!.resources.food = 6;
    s.kingdoms['draven']!.resources.gold = 30;
    const out = runAI(s, 'draven');
    const before = s.kingdoms['draven']!;
    const after = out.kingdoms['draven']!;
    const farmed = Object.values(out.provinces).some((p) => p.ownerId === 'draven' && p.foodProduction > s.provinces[p.id]!.foodProduction);
    expect(farmed || after.resources.food > before.resources.food || after.resources.military < before.resources.military).toBe(true);
  });

  it('a strong expansionist attacks a weak neighbour it hates once the grace years are over', () => {
    const s = structuredClone(fresh());
    s.year = s.startYear + 5;
    s.kingdoms['draven']!.resources.military = 80;
    s.relations.find((r) => r.kingdomA === 'ardenhal' && r.kingdomB === 'draven')!.opinion = -50;
    const out = runAI(s, 'draven');
    expect(out.battles.length + out.sieges.length).toBeGreaterThan(0);
    expect(getRelation(out, 'ardenhal', 'draven')!.stance).toBe('war');
  });

  it('a cautious AI does not start wars during the grace period', () => {
    const s = structuredClone(fresh());
    s.kingdoms['saltmere']!.resources.military = 80;
    const out = runAI(s, 'saltmere');
    expect(out.battles).toHaveLength(0);
  });

  it('keeps the world consistent over a 40-year passive campaign', () => {
    let s: GameState = fresh('long');
    const seen = { battles: 0, recruits: false };
    for (let i = 0; i < 40 && s.status === 'ongoing'; i++) {
      s = advanceYear(s);
      expect(validateGameState(s)).toEqual([]);
    }
    seen.battles = s.battles.length;
    // The world is not static: someone fought, or AIs at least changed their armies.
    const militaryChanged = s.kingdoms['draven']!.resources.military !== 35 || s.kingdoms['saltmere']!.resources.military !== 20;
    expect(seen.battles > 0 || militaryChanged).toBe(true);
  });
});
