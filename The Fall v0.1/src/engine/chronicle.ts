import type { GameState } from '../types/game';
import type { ChronicleKind } from '../types/event';

/** Keep the chronicle bounded so saves stay small. */
export const CHRONICLE_LIMIT = 200;

export function addChronicle(state: GameState, kind: ChronicleKind, message: string, year = state.year): GameState {
  const entry = { id: `c${state.nextId}`, year, kind, message };
  const chronicle = [...state.chronicle, entry].slice(-CHRONICLE_LIMIT);
  return { ...state, chronicle, nextId: state.nextId + 1 };
}
