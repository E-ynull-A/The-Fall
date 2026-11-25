import type { CardCategory } from '../../types/card';
import type { Effect, Condition } from '../../types/effect';
import type { ResourceDelta, ResourceKey } from '../../types/kingdom';
import { RESOURCE_KEYS } from '../../engine/ResourceManager';

const LABEL: Record<ResourceKey, string> = {
  gold: 'Gold',
  food: 'Food',
  military: 'Military',
  stability: 'Stability',
  legitimacy: 'Legitimacy',
};

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  economy: 'Economy',
  military: 'Military',
  politics: 'Politics',
  intrigue: 'Intrigue',
  society: 'Society',
  crisis: 'Crisis',
};

export interface DeltaLine {
  resource: ResourceKey;
  text: string;
  positive: boolean;
}

/** Turns a cost (positive = paid) into display lines like "−2 Gold". */
export function costLines(cost: ResourceDelta): DeltaLine[] {
  return RESOURCE_KEYS.filter((k) => (cost[k] ?? 0) > 0).map((k) => ({
    resource: k,
    text: `−${cost[k]} ${LABEL[k]}`,
    positive: false,
  }));
}

export function effectLines(effects: Effect[]): { text: string; positive: boolean }[] {
  const sign = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
  return effects.flatMap((e): { text: string; positive: boolean }[] => {
    switch (e.kind) {
      case 'resources':
        return RESOURCE_KEYS.filter((k) => e.delta[k] !== undefined).map((k) => {
          const v = e.delta[k] as number;
          return { text: `${sign(v)} ${LABEL[k]}`, positive: v > 0 };
        });
      case 'siege_bonus':
        return [{ text: `+${e.amount * 10}% siege assault`, positive: true }];
      case 'battle_bonus':
        return [{ text: `+${e.amount * 10}% next battle`, positive: true }];
      case 'reveal_kingdom':
        return [{ text: `Reveals a rival for ${e.years} years`, positive: true }];
      case 'province_stability':
        return [{ text: `${sign(e.amount)} province stability`, positive: e.amount > 0 }];
      case 'province_fortification':
        return [{ text: `${sign(e.amount)} fortification`, positive: e.amount > 0 }];
      case 'province_garrison':
        return [{ text: `${sign(e.amount)} enemy garrison`, positive: e.amount < 0 }];
      case 'province_food':
        return [{ text: `${sign(e.amount)} province food`, positive: e.amount > 0 }];
      case 'all_provinces_stability':
        return [{ text: `${sign(e.amount)} stability, all provinces`, positive: e.amount > 0 }];
      case 'kingdom_stability':
        return [{ text: `${sign(e.amount)} rival stability`, positive: e.amount < 0 }];
      case 'opinion':
        return [{ text: `${sign(e.amount)} their opinion of you`, positive: e.amount > 0 }];
      case 'add_card':
        return [{ text: 'Adds a card to your deck', positive: true }];
      case 'make_peace':
        return [{ text: `Truce for ${e.years} years`, positive: true }];
      case 'pay_tribute':
        return [{ text: `Pay ${e.amount} gold tribute`, positive: false }];
    }
  });
}

export function requirementText(c: Condition): string {
  switch (c.kind) {
    case 'active_siege':
      return 'Requires an active siege';
    case 'at_war':
      return 'Requires a war';
    case 'owns_province_type':
      return `Requires a ${c.type.replace('_', ' ')}`;
    case 'resource_at_least':
      return `Requires ${c.value}+ ${LABEL[c.resource]}`;
    case 'resource_below':
      return `Requires ${LABEL[c.resource]} below ${c.value}`;
    case 'year_at_least':
      return `Available from ${c.year}`;
    case 'province_stability_below':
      return 'Requires a restless province';
    case 'province_count_at_least':
      return `Requires ${c.value}+ provinces`;
  }
}

export const TARGET_LABEL = {
  none: '',
  own_province: 'Target: your province',
  enemy_province: 'Target: enemy province',
  kingdom: 'Target: rival kingdom',
} as const;
