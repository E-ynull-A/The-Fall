import type { GameState } from '../types/game';
import { endYear } from './TurnManager';
import { resolveEvent, getEventDefinition } from './EventManager';

/** Test helper: answers pending events with their first choice, then ends the year. */
export function advanceYear(state: GameState): GameState {
  let s = state;
  for (const e of s.activeEvents) {
    s = resolveEvent(s, e.instanceId, getEventDefinition(e.definitionId).choices[0]!.id);
  }
  return endYear(s);
}
