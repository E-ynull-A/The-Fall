/**
 * Deterministic, serialisable RNG (mulberry32).
 * The state is a plain 32-bit integer stored in GameState, so saved games
 * replay identically and tests are reproducible.
 */
export interface RandomResult {
  value: number; // [0, 1)
  state: number;
}

export function nextRandom(state: number): RandomResult {
  let t = (state + 0x6d2b79f5) | 0;
  const nextState = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: nextState };
}

/** Integer in [min, max] inclusive. */
export function randomInt(state: number, min: number, max: number): { value: number; state: number } {
  const r = nextRandom(state);
  return { value: min + Math.floor(r.value * (max - min + 1)), state: r.state };
}

/** Fisher–Yates shuffle that returns a new array and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const result = [...items];
  let s = state;
  for (let i = result.length - 1; i > 0; i--) {
    const r = randomInt(s, 0, i);
    s = r.state;
    const j = r.value;
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return { items: result, state: s };
}

/** Seed from a string or number (used for new campaigns). */
export function seedFrom(input: string | number): number {
  const str = String(input);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
