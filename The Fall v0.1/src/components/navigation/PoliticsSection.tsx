import type { Dispatch } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { EconomyBreakdown } from '../../types/economy';
import type { GameAction } from '../../engine/GameEngine';
import { getCardDefinition } from '../../engine/CardManager';
import { getPlayerKingdom, getProvincesOwnedBy } from '../../engine/selectors';
import { REBELLION_THRESHOLD } from '../../data/events/events';
import { kingdomModifiers } from '../sidebar/KingdomSection';
import { MiniBar, stabilityWord } from '../provinces/provinceUi';
import { ProvinceOps } from './ProvinceOps';
import type { StartTargeting } from './targeting';

interface Props {
  state: GameState;
  economy: EconomyBreakdown;
  dispatch: Dispatch<GameAction>;
  startTargeting: StartTargeting;
  onAttack: (id: ProvinceId) => void;
  onSelect: (id: ProvinceId) => void;
}

function legitimacyWord(v: number): string {
  if (v >= 70) return 'Unquestioned';
  if (v >= 45) return 'Accepted';
  if (v >= 25) return 'Doubted';
  return 'Contested';
}

/** Internal politics: legitimacy, order, restless provinces and political decrees in hand. */
export function PoliticsSection({ state, economy, dispatch, startTargeting, onAttack, onSelect }: Props) {
  const player = getPlayerKingdom(state);
  const { legitimacy, stability } = player.resources;
  const political = kingdomModifiers(state, economy).filter((m) => /legitimacy|Unrest|Disorder|Order|collapse/i.test(m.text));
  const restless = getProvincesOwnedBy(state, player.id)
    .filter((p) => p.stability < 35)
    .sort((a, b) => a.stability - b.stability);
  const decrees = state.deck.hand
    .map((c) => getCardDefinition(c.definitionId))
    .filter((c) => c.category === 'politics' || c.category === 'intrigue');

  return (
    <>
      <dl className="kv">
        <div>
          <dt>{tr('Legitimacy')}</dt>
          <dd>
            {legitimacy} · {tr(legitimacyWord(legitimacy))}
          </dd>
        </div>
        <div>
          <dt>{tr('Stability')}</dt>
          <dd>
            {stability} · {tr(stabilityWord(stability))}
          </dd>
        </div>
      </dl>
      {political.length > 0 && (
        <ul className="mods">
          {political.map((m) => (
            <li key={m.text} className={`mod mod--${m.tone}`}>
              {tr(m.text)}
            </li>
          ))}
        </ul>
      )}

      <h3 className="acc__sub">{tr('Restless provinces')}</h3>
      {restless.length === 0 ? (
        <p className="acc__muted">{tr('Every province keeps the peace.')}</p>
      ) : (
        <ul className="plist">
          {restless.map((p) => (
            <li key={p.id}>
              <button className="plist__row plist__row--noicon" onClick={() => onSelect(p.id)}>
                <span className="plist__name">{p.name}</span>
                <MiniBar value={p.stability} />
                <span className={`plist__num ${p.stability < REBELLION_THRESHOLD ? 'neg' : ''}`}>{p.stability}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="acc__sub">{tr('Internal decisions')}</h3>
      <ProvinceOps state={state} dispatch={dispatch} startTargeting={startTargeting} onAttack={onAttack} kinds={['suppress_unrest']} />

      <h3 className="acc__sub">{tr('Political decrees in hand')}</h3>
      {decrees.length === 0 ? (
        <p className="acc__muted">{tr('None in your hand this year.')}</p>
      ) : (
        <ul className="mods">
          {decrees.map((c, i) => (
            <li key={`${c.id}-${i}`} className="mod mod--warn">
              {tr(c.name)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
