import { applyResourceDelta, canAfford, missingResources, payCost } from './ResourceManager';
import type { Resources } from '../types/kingdom';

const base: Resources = { gold: 10, food: 5, military: 3, stability: 50, legitimacy: 95 };

describe('ResourceManager', () => {
  it('applies deltas without mutating input', () => {
    const next = applyResourceDelta(base, { gold: 3, stability: -1 });
    expect(next).toEqual({ ...base, gold: 13, stability: 49 });
    expect(base.gold).toBe(10);
  });

  it('never lets quantities go negative', () => {
    expect(applyResourceDelta(base, { food: -20 }).food).toBe(0);
  });

  it('caps stability and legitimacy at 100 and floors at 0', () => {
    const next = applyResourceDelta(base, { legitimacy: 20, stability: -80 });
    expect(next.legitimacy).toBe(100);
    expect(next.stability).toBe(0);
  });

  it('checks affordability', () => {
    expect(canAfford(base, { gold: 10 })).toBe(true);
    expect(canAfford(base, { gold: 11 })).toBe(false);
    expect(missingResources(base, { gold: 11, food: 2, military: 4 })).toEqual(['gold', 'military']);
  });

  it('pays costs and refuses unaffordable ones', () => {
    expect(payCost(base, { gold: 8 }).gold).toBe(2);
    expect(() => payCost(base, { food: 6 })).toThrow();
  });
});
