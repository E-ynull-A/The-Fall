import type { CardDefinition, CardDefinitionId, CardInstance, CardInstanceId, DeckState } from '../types/card';
import type { GameState } from '../types/game';
import type { KingdomId } from '../types/kingdom';
import type { ProvinceId } from '../types/province';
import type { Condition } from '../types/effect';
import { CARD_DEFINITIONS, CARD_PLAYS_PER_YEAR } from '../data/cards/cards';
import { canAfford, missingResources, payCost } from './ResourceManager';
import { applyEffects, checkCondition } from './EffectManager';
import { addChronicle } from './chronicle';
import { shuffle } from '../utils/random';

const CARD_INDEX: ReadonlyMap<CardDefinitionId, CardDefinition> = new Map(
  CARD_DEFINITIONS.map((card) => [card.id, card]),
);

export function getCardDefinition(id: CardDefinitionId): CardDefinition {
  const card = CARD_INDEX.get(id);
  if (!card) throw new Error(`Unknown card definition: ${id}`);
  return card;
}

export function hasCardDefinition(id: CardDefinitionId): boolean {
  return CARD_INDEX.has(id);
}

/** Builds and shuffles a deck from a {definitionId: copies} list. */
export function buildDeck(
  composition: Readonly<Record<CardDefinitionId, number>>,
  handSize: number,
  rngState: number,
): { deck: DeckState; rngState: number } {
  const instances: CardInstance[] = [];
  for (const [definitionId, copies] of Object.entries(composition)) {
    getCardDefinition(definitionId); // validate early
    for (let i = 0; i < copies; i++) {
      instances.push({ instanceId: `${definitionId}#${i + 1}`, definitionId });
    }
  }
  const shuffled = shuffle(instances, rngState);
  return {
    deck: { drawPile: shuffled.items, hand: [], discardPile: [], handSize },
    rngState: shuffled.state,
  };
}

/**
 * Draws up to `count` cards. When the draw pile runs out, the discard pile
 * is shuffled into a new draw pile. Stops early if both are empty.
 */
export function drawCards(
  deck: DeckState,
  count: number,
  rngState: number,
): { deck: DeckState; rngState: number; drawn: CardInstance[] } {
  let drawPile = [...deck.drawPile];
  let discardPile = [...deck.discardPile];
  const hand = [...deck.hand];
  const drawn: CardInstance[] = [];
  let state = rngState;

  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      const reshuffled = shuffle(discardPile, state);
      drawPile = reshuffled.items;
      state = reshuffled.state;
      discardPile = [];
    }
    const card = drawPile.shift() as CardInstance;
    hand.push(card);
    drawn.push(card);
  }

  return { deck: { ...deck, drawPile, discardPile, hand }, rngState: state, drawn };
}

/** Draws until the hand is full. */
export function refillHand(deck: DeckState, rngState: number) {
  return drawCards(deck, Math.max(0, deck.handSize - deck.hand.length), rngState);
}

// ── Playing cards (Phase 4) ───────────────────────────────────────────────

/** Target chosen by the player when a card needs one. */
export interface CardTarget {
  provinceId?: ProvinceId;
  kingdomId?: KingdomId;
}

export type CardCheck = { ok: true } | { ok: false; reason: string };

function requirementReason(c: Condition): string {
  switch (c.kind) {
    case 'active_siege':
      return 'Requires an active siege.';
    case 'at_war':
      return 'Requires a war.';
    case 'owns_province_type':
      return `Requires a ${c.type.replace('_', ' ')} province.`;
    case 'resource_at_least':
      return `Requires at least ${c.value} ${c.resource}.`;
    case 'resource_below':
      return `Only when ${c.resource} is below ${c.value}.`;
    case 'year_at_least':
      return `Not before ${c.year}.`;
    case 'province_stability_below':
      return `Requires a province with stability below ${c.value}.`;
    case 'province_count_at_least':
      return `Requires at least ${c.value} provinces.`;
  }
}

/** Checks the card's requirements and cost, ignoring the target. */
export function checkCardBasics(state: GameState, instanceId: CardInstanceId): CardCheck {
  if (state.status !== 'ongoing') return { ok: false, reason: 'The campaign has ended.' };
  const instance = state.deck.hand.find((c) => c.instanceId === instanceId);
  if (!instance) return { ok: false, reason: 'That card is not in your hand.' };
  if (state.cardsPlayedThisYear >= CARD_PLAYS_PER_YEAR) {
    return { ok: false, reason: `You may issue only ${CARD_PLAYS_PER_YEAR} decrees per year.` };
  }
  const card = getCardDefinition(instance.definitionId);
  const player = state.kingdoms[state.playerKingdomId]!;
  for (const req of card.requirements) {
    if (!checkCondition(state, player.id, req)) return { ok: false, reason: requirementReason(req) };
  }
  if (!canAfford(player.resources, card.cost)) {
    return { ok: false, reason: `Not enough ${missingResources(player.resources, card.cost).join(' and ')}.` };
  }
  return { ok: true };
}

/** Full validation including the target (GDD §6.3, §17.6). */
export function checkCardPlay(state: GameState, instanceId: CardInstanceId, target: CardTarget = {}): CardCheck {
  const basics = checkCardBasics(state, instanceId);
  if (!basics.ok) return basics;
  const instance = state.deck.hand.find((c) => c.instanceId === instanceId)!;
  const card = getCardDefinition(instance.definitionId);
  const playerId = state.playerKingdomId;

  switch (card.target) {
    case 'none':
      return { ok: true };
    case 'own_province': {
      const p = target.provinceId ? state.provinces[target.provinceId] : undefined;
      if (!p) return { ok: false, reason: 'Select one of your provinces on the map.' };
      if (p.ownerId !== playerId) return { ok: false, reason: 'Target must be one of your provinces.' };
      return { ok: true };
    }
    case 'enemy_province': {
      const p = target.provinceId ? state.provinces[target.provinceId] : undefined;
      if (!p) return { ok: false, reason: 'Select an enemy province on the map.' };
      if (p.ownerId === playerId) return { ok: false, reason: 'Target must be a foreign province.' };
      return { ok: true };
    }
    case 'kingdom': {
      const k = target.kingdomId ? state.kingdoms[target.kingdomId] : undefined;
      if (!k || k.isPlayer) return { ok: false, reason: 'Choose a rival kingdom.' };
      if (k.isEliminated) return { ok: false, reason: 'That kingdom has fallen.' };
      return { ok: true };
    }
  }
}

/** Plays a card: pays the cost, applies effects, discards it. Invalid plays leave state unchanged. */
export function playCard(state: GameState, instanceId: CardInstanceId, target: CardTarget = {}): GameState {
  if (!checkCardPlay(state, instanceId, target).ok) return state;
  const instance = state.deck.hand.find((c) => c.instanceId === instanceId)!;
  const card = getCardDefinition(instance.definitionId);
  const player = state.kingdoms[state.playerKingdomId]!;

  let next: GameState = {
    ...state,
    kingdoms: { ...state.kingdoms, [player.id]: { ...player, resources: payCost(player.resources, card.cost) } },
    deck: {
      ...state.deck,
      hand: state.deck.hand.filter((c) => c.instanceId !== instanceId),
      discardPile: [...state.deck.discardPile, instance],
    },
    cardsPlayedThisYear: state.cardsPlayedThisYear + 1,
  };
  next = applyEffects(next, card.effects, {
    actorId: player.id,
    targetProvinceId: card.target.endsWith('province') ? target.provinceId : undefined,
    targetKingdomId: card.target === 'kingdom' ? target.kingdomId : undefined,
  });

  let targetName = '';
  if (card.target.endsWith('province') && target.provinceId) targetName = state.provinces[target.provinceId]?.name ?? '';
  if (card.target === 'kingdom' && target.kingdomId) targetName = state.kingdoms[target.kingdomId]?.shortName ?? '';
  return addChronicle(next, 'card', `Decree: ${card.name}${targetName ? ` (${targetName})` : ''}.`);
}

/** Once per year the player may discard one card from hand and draw a replacement. */
export function redrawCard(state: GameState, instanceId: CardInstanceId): GameState {
  if (state.status !== 'ongoing' || state.cardRedrawYear === state.year) return state;
  const instance = state.deck.hand.find((c) => c.instanceId === instanceId);
  if (!instance) return state;
  const deck = {
    ...state.deck,
    hand: state.deck.hand.filter((c) => c.instanceId !== instanceId),
    discardPile: [...state.deck.discardPile, instance],
  };
  const drawn = drawCards(deck, 1, state.rngState);
  return { ...state, deck: drawn.deck, rngState: drawn.rngState, cardRedrawYear: state.year };
}
