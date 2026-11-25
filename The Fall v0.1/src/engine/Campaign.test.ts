import { createNewCampaign, gameReducer } from './GameEngine';
import { endYear } from './TurnManager';
import { advanceYear } from './testUtils';
import { validateGameState } from './validation';
import { SCENARIOS } from '../data/scenarios/scenarios';
import { getRelation } from './relations';
import type { GameState } from '../types/game';

const fresh = () => createNewCampaign({ seed: 'campaign' });

describe('objectives and victory', () => {
  it('applies the reward and celebrates the primary objective', () => {
    const s = structuredClone(fresh());
    s.provinces['brightwater']!.ownerId = 'ardenhal';
    s.provinces['ironridge']!.ownerId = 'ardenhal';
    const legit = s.kingdoms['ardenhal']!.resources.legitimacy;
    const next = endYear(s);
    expect(next.objectives.find((o) => o.id === 'reclaim_old_borders')?.status).toBe('completed');
    expect(next.pendingTriumph).toBe('reclaim_old_borders');
    expect(next.status).toBe('ongoing'); // the main campaign continues
    expect(next.kingdoms['ardenhal']!.resources.legitimacy).toBeGreaterThanOrEqual(legit + 10);
    expect(gameReducer(next, { type: 'ACK_TRIUMPH' }).pendingTriumph).toBeNull();
  });

  it('unification ends the campaign in victory', () => {
    const s = structuredClone(fresh());
    for (const p of Object.values(s.provinces)) p.ownerId = 'ardenhal';
    const next = endYear(s);
    expect(next.status).toBe('victory');
    expect(endYear(next)).toBe(next);
  });

  it('A Kingdom Reborn fails after its deadline', () => {
    let s: GameState = { ...fresh(), year: fresh().startYear + 20 };
    s = endYear(s);
    expect(s.objectives.find((o) => o.id === 'kingdom_reborn')?.status).toBe('failed');
  });

  it('total collapse for two years is a defeat', () => {
    const s = structuredClone(fresh());
    Object.assign(s.kingdoms['ardenhal']!.resources, { gold: 0, food: 0, stability: 10 });
    for (const p of Object.values(s.provinces)) if (p.ownerId === 'ardenhal') p.foodProduction = 0;
    const once = endYear(s);
    expect(once.crisisYears).toBe(1);
    const twice = endYear({ ...once, activeEvents: [] });
    expect(twice.status).toBe('defeat');
  });
});

describe('scenarios', () => {
  it('every scenario starts valid with only its own objective', () => {
    for (const sc of SCENARIOS) {
      const s = createNewCampaign({ seed: 'sc', scenarioId: sc.id });
      expect(validateGameState(s)).toEqual([]);
      expect(s.mode).toBe('scenario');
      expect(s.objectives.map((o) => o.id)).toEqual([sc.objectiveId]);
    }
  });

  it('applies scenario changes to the standard start', () => {
    const s = createNewCampaign({ seed: 'sc', scenarioId: 'iron_tide' });
    expect(s.kingdoms['draven']!.resources.military).toBe(60);
    expect(getRelation(s, 'ardenhal', 'draven')?.stance).toBe('war');
    expect(getRelation(s, 'ardenhal', 'saltmere')?.stance).toBe('alliance');
  });

  it('is won by completing the objective in time', () => {
    const s = structuredClone(createNewCampaign({ seed: 'sc', scenarioId: 'restoration' }));
    s.provinces['brightwater']!.ownerId = 'ardenhal';
    s.provinces['ironridge']!.ownerId = 'ardenhal';
    expect(endYear(s).status).toBe('victory');
  });

  it('is lost when time runs out', () => {
    let s = createNewCampaign({ seed: 'sc', scenarioId: 'restoration' });
    s = { ...s, year: s.scenario!.lastYear };
    const out = endYear(s);
    expect(out.status).toBe('defeat');
    expect(out.defeatReason).toMatch(/Time has run out/);
  });

  it('Hold the Line is won by surviving ten years', () => {
    let s = structuredClone(createNewCampaign({ seed: 'sc', scenarioId: 'iron_tide' }));
    // Disarm Draven each year so this test measures the clock, not the war.
    for (let i = 0; i < 10 && s.status === 'ongoing'; i++) {
      s.kingdoms['draven']!.resources.military = 0;
      s = structuredClone(advanceYear(s));
    }
    expect({ status: s.status, reason: s.defeatReason }).toEqual({ status: 'victory', reason: null });
    expect(s.year - s.startYear).toBe(9);
  });
});
