import { createNewCampaign, gameReducer } from '../engine/GameEngine';
import { advanceYear } from '../engine/testUtils';
import { deleteSave, listSaves, loadGame, parseSave, saveGame, serializeSave, type KeyValueStore } from './SaveService';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('SaveService', () => {
  it('round-trips the full game state', () => {
    const store = memoryStore();
    let s = createNewCampaign({ seed: 'save' });
    s = gameReducer(s, { type: 'PROVINCE_ACTION', provinceId: 'greenvale', action: 'develop_infrastructure' });
    s = advanceYear(advanceYear(s));
    expect(saveGame(s, 'slot1', 'My reign', store)).toBe(true);
    const loaded = loadGame('slot1', store);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state).toEqual(s);
  });

  it('continues identically after loading (seeded RNG is part of the state)', () => {
    const store = memoryStore();
    const s = advanceYear(createNewCampaign({ seed: 'replay' }));
    saveGame(s, 'auto', undefined, store);
    const loaded = loadGame('auto', store);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(advanceYear(loaded.state)).toEqual(advanceYear(s));
  });

  it('lists and deletes saves', () => {
    const store = memoryStore();
    saveGame(createNewCampaign({ seed: 1 }), 'slot2', 'Second', store);
    const list = listSaves(store);
    expect(list[0]).toBeNull();
    expect(list[2]).toMatchObject({ slot: 'slot2', label: 'Second', year: 1187 });
    deleteSave('slot2', store);
    expect(listSaves(store)[2]).toBeNull();
    expect(loadGame('slot2', store)).toEqual({ ok: false, error: 'This slot is empty.' });
  });

  it('rejects corrupt, outdated, incomplete and invalid saves', () => {
    expect(parseSave('{nope').ok).toBe(false);
    const good = JSON.parse(serializeSave(createNewCampaign({ seed: 2 }), 'x'));
    expect(parseSave(JSON.stringify({ ...good, saveVersion: 0 }))).toMatchObject({ ok: false });
    const incomplete = structuredClone(good);
    delete incomplete.state.deck;
    expect(parseSave(JSON.stringify(incomplete))).toMatchObject({ ok: false });
    const invalid = structuredClone(good);
    invalid.state.provinces.greenvale.ownerId = 'nobody';
    expect(parseSave(JSON.stringify(invalid))).toMatchObject({ ok: false });
    expect(parseSave(JSON.stringify(good)).ok).toBe(true);
  });

  it('fails gracefully when storage is unavailable', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(saveGame(createNewCampaign({ seed: 3 }), 'slot1', 'x', broken)).toBe(false);
    expect(loadGame('slot1', broken).ok).toBe(false);
    expect(listSaves(broken).every((x) => x === null)).toBe(true);
  });
});
