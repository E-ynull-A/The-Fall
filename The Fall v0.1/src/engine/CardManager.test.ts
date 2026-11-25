import { buildDeck, drawCards } from './CardManager';

describe('CardManager', () => {
  it('builds a deck with the requested copies', () => {
    const { deck } = buildDeck({ tax_reform: 2, raise_levy: 1 }, 5, 42);
    expect(deck.drawPile).toHaveLength(3);
    expect(deck.drawPile.filter((c) => c.definitionId === 'tax_reform')).toHaveLength(2);
  });

  it('rejects unknown cards', () => {
    expect(() => buildDeck({ not_a_card: 1 }, 5, 1)).toThrow();
  });

  it('is deterministic for the same seed', () => {
    const a = buildDeck({ tax_reform: 3, raise_levy: 3, spy_network: 3 }, 5, 7);
    const b = buildDeck({ tax_reform: 3, raise_levy: 3, spy_network: 3 }, 5, 7);
    expect(a.deck.drawPile).toEqual(b.deck.drawPile);
  });

  it('reshuffles the discard pile when the draw pile runs out', () => {
    const { deck, rngState } = buildDeck({ tax_reform: 2 }, 5, 3);
    const emptied = { ...deck, drawPile: [], discardPile: deck.drawPile };
    const result = drawCards(emptied, 1, rngState);
    expect(result.deck.hand).toHaveLength(1);
    expect(result.deck.drawPile.length + result.deck.discardPile.length).toBe(1);
  });

  it('stops drawing when no cards remain', () => {
    const { deck, rngState } = buildDeck({ tax_reform: 2 }, 5, 3);
    const result = drawCards(deck, 5, rngState);
    expect(result.drawn).toHaveLength(2);
  });
});
