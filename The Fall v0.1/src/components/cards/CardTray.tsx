import { tr } from '../../i18n/i18n';
import { useState, type Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { KingdomId } from '../../types/kingdom';
import type { GameAction } from '../../engine/GameEngine';
import { checkCardBasics, checkCardPlay, getCardDefinition } from '../../engine/CardManager';
import { getKingdomList } from '../../engine/selectors';
import { CARD_PLAYS_PER_YEAR } from '../../data/cards/cards';
import { CardView } from './CardView';
import { TARGET_LABEL } from './formatCard';

interface CardTrayProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  selectedProvinceId: ProvinceId | null;
  collapsed: boolean;
  onToggle: () => void;
}

/** The player's hand. Select a card, choose a target if needed, then issue the decree. */
export function CardTray({ state, dispatch, selectedProvinceId, collapsed, onToggle }: CardTrayProps) {
  const { hand, drawPile, discardPile, handSize } = state.deck;
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [targetKingdom, setTargetKingdom] = useState<KingdomId | null>(null);
  const empty = Math.max(0, handSize - hand.length);
  const playsLeft = Math.max(0, CARD_PLAYS_PER_YEAR - state.cardsPlayedThisYear);
  const redrawAvailable = state.cardRedrawYear !== state.year && state.status === 'ongoing';

  const active = hand.find((c) => c.instanceId === selectedCard);
  const activeDef = active ? getCardDefinition(active.definitionId) : null;
  const target = { provinceId: selectedProvinceId ?? undefined, kingdomId: targetKingdom ?? undefined };
  const check = active ? checkCardPlay(state, active.instanceId, target) : null;
  const rivals = getKingdomList(state).filter((k) => !k.isPlayer && !k.isEliminated);

  const play = () => {
    if (!active || !check?.ok) return;
    dispatch({ type: 'PLAY_CARD', instanceId: active.instanceId, target });
    setSelectedCard(null);
    setTargetKingdom(null);
  };

  return (
    <section className={`tray ${collapsed ? 'tray--collapsed' : ''}`} aria-label={tr('Royal decrees (hand)')}>
      <div className="tray__meta">
        <button className="tray__toggle" aria-expanded={!collapsed} aria-controls="tray-body" onClick={onToggle} title={tr(collapsed ? 'Show decrees' : 'Hide decrees')}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="tray__chev">
            <path d="M3 7.5 L6 4.5 L9 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="tray__title">{tr('Royal Decrees')}</span>
        <span className={`tray__plays ${playsLeft === 0 ? 'neg' : ''}`}>
          {playsLeft}{' '}{tr('of')}{' '}{CARD_PLAYS_PER_YEAR}{' '}{tr('decrees left this year')}</span>
        <span className="tray__count" title={tr('Draw pile')}>{tr('Deck')}{' '}{drawPile.length}
        </span>
        <span className="tray__count" title={tr('Discard pile')}>{tr('Discard')}{' '}{discardPile.length}
        </span>
      </div>

      <div className="tray__body" id="tray-body" aria-hidden={collapsed}>
        <div className="tray__body-inner">
      <div className="tray__hand">
        {hand.map((c) => {
          const def = getCardDefinition(c.definitionId);
          const basics = checkCardBasics(state, c.instanceId);
          return (
            <CardView
              key={c.instanceId}
              card={def}
              selected={c.instanceId === selectedCard}
              playable={basics.ok}
              onSelect={() => {
                setSelectedCard(c.instanceId === selectedCard ? null : c.instanceId);
                setTargetKingdom(null);
              }}
            />
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <div key={`empty-${i}`} className="card card--empty" aria-hidden>
            <span className="card--empty__mark">♛</span>
            <span className="card--empty__text">{tr('Empty slot')}</span>
          </div>
        ))}
      </div>

      {active && activeDef && (
        <div className="decree" role="region" aria-label={tr('Selected decree')}>
          <div className="decree__info">
            <strong className="decree__name">{tr(activeDef.name)}</strong>
            {activeDef.target !== 'none' && <span className="decree__target">{tr(TARGET_LABEL[activeDef.target])}</span>}
            {activeDef.target.endsWith('province') && (
              <span className="small muted">
                {tr(selectedProvinceId ? `Selected: ${state.provinces[selectedProvinceId]?.name}` : 'Click a province on the map.')}
              </span>
            )}
            {activeDef.target === 'kingdom' && (
              <span className="decree__kingdoms">
                {rivals.map((k) => (
                  <button
                    key={k.id}
                    className={`neighbor-chip ${targetKingdom === k.id ? 'neighbor-chip--active' : ''}`}
                    style={{ ['--realm' as string]: k.color }}
                    onClick={() => setTargetKingdom(k.id)}
                  >
                    {k.shortName}
                  </button>
                ))}
              </span>
            )}
            {check && !check.ok && <span className="decree__reason">{tr(check.reason)}</span>}
          </div>
          <div className="decree__actions">
            <button
              className="btn btn--ghost btn--small"
              disabled={!redrawAvailable}
              title={tr(redrawAvailable ? 'Discard this card and draw another (once per year)' : 'Already used this year')}
              onClick={() => {
                dispatch({ type: 'REDRAW_CARD', instanceId: active.instanceId });
                setSelectedCard(null);
              }}
            >{tr('Replace card')}</button>
            <button className="btn btn--primary btn--small" disabled={!check?.ok} onClick={play}>{tr('Issue decree')}</button>
          </div>
        </div>
      )}
      </div>
      </div>
    </section>
  );
}
