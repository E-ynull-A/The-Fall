import type { ResourceDelta, ResourceKey, Resources } from '../types/kingdom';

/**
 * Central resource rules (GDD §4.2). All resource changes go through here.
 * Gold, Food and Military are non-negative quantities.
 * Stability and Legitimacy are percentages bounded to 0–100.
 */
export const RESOURCE_KEYS: readonly ResourceKey[] = ['gold', 'food', 'military', 'stability', 'legitimacy'];

export const RESOURCE_BOUNDS: Record<ResourceKey, { min: number; max: number }> = {
  gold: { min: 0, max: Number.POSITIVE_INFINITY },
  food: { min: 0, max: Number.POSITIVE_INFINITY },
  military: { min: 0, max: Number.POSITIVE_INFINITY },
  stability: { min: 0, max: 100 },
  legitimacy: { min: 0, max: 100 },
};

export function clampResource(key: ResourceKey, value: number): number {
  const { min, max } = RESOURCE_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampResources(resources: Resources): Resources {
  return {
    gold: clampResource('gold', resources.gold),
    food: clampResource('food', resources.food),
    military: clampResource('military', resources.military),
    stability: clampResource('stability', resources.stability),
    legitimacy: clampResource('legitimacy', resources.legitimacy),
  };
}

/** Applies a delta and clamps the result to valid bounds. Never mutates the input. */
export function applyResourceDelta(resources: Resources, delta: ResourceDelta): Resources {
  const next: Resources = { ...resources };
  for (const key of RESOURCE_KEYS) {
    const change = delta[key];
    if (change !== undefined) next[key] = resources[key] + change;
  }
  return clampResources(next);
}

/** `cost` uses positive numbers for amounts that must be paid. */
export function canAfford(resources: Resources, cost: ResourceDelta): boolean {
  return RESOURCE_KEYS.every((key) => {
    const amount = cost[key];
    return amount === undefined || amount <= 0 || resources[key] >= amount;
  });
}

/** Lists the resources that are short for a cost (for UI feedback). */
export function missingResources(resources: Resources, cost: ResourceDelta): ResourceKey[] {
  return RESOURCE_KEYS.filter((key) => {
    const amount = cost[key];
    return amount !== undefined && amount > 0 && resources[key] < amount;
  });
}

/** Pays a cost. Throws if unaffordable — callers must validate first. */
export function payCost(resources: Resources, cost: ResourceDelta): Resources {
  if (!canAfford(resources, cost)) {
    throw new Error(`Cannot afford cost: missing ${missingResources(resources, cost).join(', ')}`);
  }
  const negative: ResourceDelta = {};
  for (const key of RESOURCE_KEYS) {
    const amount = cost[key];
    if (amount !== undefined) negative[key] = -amount;
  }
  return applyResourceDelta(resources, negative);
}
