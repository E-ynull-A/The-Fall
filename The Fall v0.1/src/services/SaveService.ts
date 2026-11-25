import { SAVE_VERSION, type GameState } from '../types/game';
import { validateGameState } from '../engine/validation';
import { createNewCampaign } from '../engine/GameEngine';

/**
 * LocalStorage persistence (GDD §13). Saves the full game state, never UI state.
 * Every storage access is guarded: private windows and blocked storage simply report failure.
 */

export type SlotId = 'auto' | 'slot1' | 'slot2' | 'slot3';
export const SLOTS: readonly SlotId[] = ['auto', 'slot1', 'slot2', 'slot3'];
const KEY_PREFIX = 'thefall.save.';

export interface SaveFile {
  saveVersion: number;
  savedAt: string;
  label: string;
  state: GameState;
}

export interface SaveSummary {
  slot: SlotId;
  label: string;
  savedAt: string;
  year: number;
  mode: GameState['mode'];
  status: GameState['status'];
}

/** Minimal storage interface so tests can provide an in-memory implementation. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; error: string };

/** Every key of a fresh state must be present in a loaded one. */
const REQUIRED_KEYS = Object.keys(createNewCampaign({ seed: 'shape' })) as (keyof GameState)[];

/** Parses and validates a save file's text. */
export function parseSave(text: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The save file is corrupted.' };
  }
  const file = data as Partial<SaveFile>;
  if (!file || typeof file !== 'object' || !file.state || typeof file.state !== 'object') {
    return { ok: false, error: 'The save file has no game state.' };
  }
  if (file.saveVersion !== SAVE_VERSION || file.state.saveVersion !== SAVE_VERSION) {
    return { ok: false, error: `Unsupported save version ${String(file.saveVersion)} (expected ${SAVE_VERSION}).` };
  }
  const missing = REQUIRED_KEYS.filter((k) => !(k in (file.state as object)));
  if (missing.length > 0) return { ok: false, error: `The save is incomplete (missing ${missing.slice(0, 3).join(', ')}).` };
  const errors = validateGameState(file.state);
  if (errors.length > 0) return { ok: false, error: `The save failed validation: ${errors[0]}` };
  return { ok: true, state: file.state };
}

export function serializeSave(state: GameState, label: string): string {
  const file: SaveFile = { saveVersion: SAVE_VERSION, savedAt: new Date().toISOString(), label, state };
  return JSON.stringify(file);
}

export function saveGame(state: GameState, slot: SlotId, label?: string, store = defaultStore()): boolean {
  if (!store) return false;
  const name = label ?? `${state.mode === 'scenario' ? 'Scenario' : 'Campaign'}, ${state.year}`;
  try {
    store.setItem(KEY_PREFIX + slot, serializeSave(state, name));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: SlotId, store = defaultStore()): LoadResult {
  if (!store) return { ok: false, error: 'Browser storage is unavailable.' };
  let text: string | null;
  try {
    text = store.getItem(KEY_PREFIX + slot);
  } catch {
    return { ok: false, error: 'Browser storage is unavailable.' };
  }
  if (!text) return { ok: false, error: 'This slot is empty.' };
  return parseSave(text);
}

export function deleteSave(slot: SlotId, store = defaultStore()): void {
  try {
    store?.removeItem(KEY_PREFIX + slot);
  } catch {
    /* ignore */
  }
}

export function listSaves(store = defaultStore()): (SaveSummary | null)[] {
  return SLOTS.map((slot) => {
    if (!store) return null;
    try {
      const text = store.getItem(KEY_PREFIX + slot);
      if (!text) return null;
      const file = JSON.parse(text) as SaveFile;
      return {
        slot,
        label: file.label,
        savedAt: file.savedAt,
        year: file.state.year,
        mode: file.state.mode,
        status: file.state.status,
      };
    } catch {
      return null;
    }
  });
}
