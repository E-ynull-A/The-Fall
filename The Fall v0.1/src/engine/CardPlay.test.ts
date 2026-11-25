import { advanceYear } from './testUtils';
import { createNewCampaign, gameReducer } from './GameEngine';
import { checkCardPlay, playCard, redrawCard } from './CardManager';
import { endYear } from './TurnManager';
import { CARD_DEFINITIONS, CARD_PLAYS_PER_YEAR, STARTING_DECK } from '../data/cards/cards';
import { validateGameState } from './validation';
import type { GameState } from '../types/game';

/** Puts specific cards into the player's hand for a test. */
function withHand(state: GameState, ids: string[]): GameState {
  return { ...state, deck: { ...state.deck, hand: ids.map((id, i) => ({ instanceId: `t${i}`, definitionId: id })) } };
}
const fresh = () => createNewCampaign({ seed: 'cards' });
const res = (s: GameState) => s.kingdoms[s.playerKingdomId]!.resources;

describe('card set', () => {
  it('has 25–30 unique cards across all six categories', () => {
    expect(CARD_DEFINITIONS.length).toBeGreaterThanOrEqual(25);
    expect(CARD_DEFINITIONS.length).toBeLessThanOrEqual(30);
    expect(new Set(CARD_DEFINITIONS.map((c) => c.id)).size).toBe(CARD_DEFINITIONS.length);
    expect(new Set(CARD_DEFINITIONS.map((c) => c.category)).size).toBe(6);
    for (const c of CARD_DEFINITIONS) expect(STARTING_DECK[c.id]).toBeGreaterThan(0);
  });
});

describe('playing cards', () => {
  it('pays the cost, applies effects and discards the card', () => {
    const s = withHand(fresh(), ['recruit_knights']);
    const next = playCard(s, 't0');
    expect(res(next).gold).toBe(18);
    expect(res(next).military).toBe(17);
    expect(next.deck.hand).toHaveLength(0);
    expect(next.deck.discardPile.at(-1)?.definitionId).toBe('recruit_knights');
    expect(next.cardsPlayedThisYear).toBe(1);
  });

  it('rejects unaffordable cards without changing state', () => {
    const s = withHand(fresh(), ['open_royal_granaries']);
    s.kingdoms['ardenhal']!.resources.food = 5;
    expect(checkCardPlay(s, 't0')).toEqual({ ok: false, reason: 'Not enough food.' });
    expect(playCard(s, 't0')).toBe(s);
  });

  it('enforces requirements', () => {
    const s = withHand(fresh(), ['siege_preparations', 'trade_charter']);
    expect(checkCardPlay(s, 't0')).toMatchObject({ ok: false, reason: 'Requires an active siege.' });
    // Ardenhal owns no coastal port at the start.
    expect(checkCardPlay(s, 't1').ok).toBe(false);
  });

  it('validates targets', () => {
    const s = withHand(fresh(), ['local_charter', 'sabotage', 'spy_network']);
    expect(checkCardPlay(s, 't0').ok).toBe(false);
    expect(checkCardPlay(s, 't0', { provinceId: 'ironridge' }).ok).toBe(false);
    expect(checkCardPlay(s, 't0', { provinceId: 'thornfield' }).ok).toBe(true);
    expect(checkCardPlay(s, 't1', { provinceId: 'thornfield' }).ok).toBe(false);
    expect(checkCardPlay(s, 't2', { kingdomId: 'ardenhal' }).ok).toBe(false);

    const charter = playCard(s, 't0', { provinceId: 'thornfield' });
    expect(charter.provinces['thornfield']!.stability).toBe(45);
    const sabotage = playCard(s, 't1', { provinceId: 'ironridge' });
    expect(sabotage.provinces['ironridge']!.garrison).toBe(0);
    const spy = playCard(s, 't2', { kingdomId: 'draven' });
    expect(spy.revealedUntil['draven']).toBe(s.year + 2);
  });

  it(`allows only ${CARD_PLAYS_PER_YEAR} decrees per year and resets each year`, () => {
    let s = withHand(fresh(), ['tax_reform', 'tax_reform', 'tax_reform', 'tax_reform']);
    s = { ...s, deck: { ...s.deck, hand: s.deck.hand.map((c, i) => ({ ...c, instanceId: `t${i}` })) } };
    for (let i = 0; i < CARD_PLAYS_PER_YEAR; i++) s = playCard(s, `t${i}`);
    expect(checkCardPlay(s, 't3').ok).toBe(false);
    const next = endYear(s);
    expect(next.cardsPlayedThisYear).toBe(0);
    expect(next.deck.hand).toHaveLength(5);
  });

  it('redraws one card per year', () => {
    const s = fresh();
    const first = s.deck.hand[0]!.instanceId;
    const a = redrawCard(s, first);
    expect(a.deck.hand).toHaveLength(5);
    expect(a.deck.hand.some((c) => c.instanceId === first)).toBe(false);
    expect(redrawCard(a, a.deck.hand[0]!.instanceId)).toBe(a);
  });

  it('keeps the deck consistent through many years of play', () => {
    let s = fresh();
    for (let y = 0; y < 15 && s.status === 'ongoing'; y++) {
      for (const c of [...s.deck.hand]) s = gameReducer(s, { type: 'PLAY_CARD', instanceId: c.instanceId });
      s = advanceYear(s);
    }
    expect(validateGameState(s)).toEqual([]);
    const total = s.deck.hand.length + s.deck.drawPile.length + s.deck.discardPile.length;
    // Events may add cards (deck modification), never remove them.
    expect(total).toBeGreaterThanOrEqual(Object.values(STARTING_DECK).reduce((a, b) => a + b, 0));
  });
});
