import type { ResourceDelta } from './kingdom';
import type { Condition, Effect } from './effect';

export type CardCategory = 'economy' | 'military' | 'politics' | 'intrigue' | 'society' | 'crisis';

export type CardRarity = 'common' | 'uncommon' | 'rare';

export type CardTargetKind = 'none' | 'own_province' | 'enemy_province' | 'kingdom';

export type CardDefinitionId = string;

/** Data-driven card definition (GDD §6.3). No React here. */
export interface CardDefinition {
  id: CardDefinitionId;
  name: string;
  description: string;
  category: CardCategory;
  rarity: CardRarity;
  /** Resources paid to play the card. Values are positive amounts. */
  cost: ResourceDelta;
  effects: Effect[];
  requirements: Condition[];
  target: CardTargetKind;
}

export type CardInstanceId = string;

/** A physical copy of a card in the deck. */
export interface CardInstance {
  instanceId: CardInstanceId;
  definitionId: CardDefinitionId;
}

export interface DeckState {
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  handSize: number;
}
