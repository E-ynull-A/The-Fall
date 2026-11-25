import { STARTING_DECK } from '../data/cards/cards';
import { createNewCampaign, gameReducer } from './GameEngine';
import { validateGameState } from './validation';
import { getAllObjectiveProgress } from './ObjectiveManager';
import { getProvincesOwnedBy } from './selectors';

describe('createNewCampaign', () => {
  const state = createNewCampaign({ seed: 'test-seed' });

  it('produces a structurally valid state', () => {
    expect(validateGameState(state)).toEqual([]);
  });

  it('has 12 provinces, 3 kingdoms and one player', () => {
    expect(Object.keys(state.provinces)).toHaveLength(12);
    expect(Object.keys(state.kingdoms)).toHaveLength(3);
    expect(Object.values(state.kingdoms).filter((k) => k.isPlayer)).toHaveLength(1);
  });

  it('gives every kingdom four provinces including its capital', () => {
    for (const kingdom of Object.values(state.kingdoms)) {
      const owned = getProvincesOwnedBy(state, kingdom.id);
      expect(owned).toHaveLength(4);
      expect(owned.some((p) => p.id === kingdom.capitalProvinceId)).toBe(true);
    }
  });

  it('builds a connected map', () => {
    const start = Object.keys(state.provinces)[0] as string;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift() as string;
      for (const n of state.provinces[id]!.neighbors) {
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(12);
  });

  it('deals a starting hand of five', () => {
    expect(state.deck.hand).toHaveLength(5);
    expect(state.deck.hand.length + state.deck.drawPile.length).toBe(Object.values(STARTING_DECK).reduce((a, b) => a + b, 0));
  });

  it('is reproducible from the same seed', () => {
    expect(createNewCampaign({ seed: 'test-seed' })).toEqual(state);
    expect(createNewCampaign({ seed: 'other' }).deck.hand).not.toEqual(state.deck.hand);
  });

  it('starts with two lost provinces to reclaim', () => {
    const reclaim = getAllObjectiveProgress(state).find((o) => o.definition.id === 'reclaim_old_borders');
    expect(reclaim?.progress).toMatchObject({ current: 4, target: 6 });
  });

  it('tracks objectives from real ownership', () => {
    const conquered = structuredClone(state);
    conquered.provinces['brightwater']!.ownerId = 'ardenhal';
    conquered.provinces['draven_hold']!.ownerId = 'ardenhal';
    const progress = getAllObjectiveProgress(conquered);
    expect(progress.find((o) => o.definition.id === 'reclaim_old_borders')?.progress.current).toBe(5);
    expect(progress.find((o) => o.definition.id === 'iron_crown')?.progress.current).toBe(1);
    expect(progress.find((o) => o.definition.id === 'unification')?.progress.current).toBe(6);
  });

  it('does not share mutable data with the static definitions', () => {
    const a = createNewCampaign({ seed: 1 });
    a.kingdoms['ardenhal']!.resources.gold = 999;
    a.provinces['greenvale']!.neighbors.push('x');
    const b = createNewCampaign({ seed: 1 });
    expect(b.kingdoms['ardenhal']!.resources.gold).toBe(20);
    expect(b.provinces['greenvale']!.neighbors).not.toContain('x');
  });
});

describe('gameReducer', () => {
  it('changes the primary objective only to a known objective', () => {
    const state = createNewCampaign({ seed: 2 });
    expect(gameReducer(state, { type: 'SET_PRIMARY_OBJECTIVE', objectiveId: 'unification' }).primaryObjectiveId).toBe(
      'unification',
    );
    expect(gameReducer(state, { type: 'SET_PRIMARY_OBJECTIVE', objectiveId: 'nope' })).toBe(state);
  });
});
