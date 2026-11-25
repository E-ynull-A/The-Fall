import { tr } from '../../i18n/i18n';
import type { Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { Province } from '../../types/province';
import type { ProvinceActionKind, TaxLevel } from '../../types/economy';
import type { GameAction } from '../../engine/GameEngine';
import { checkProvinceAction } from '../../engine/ProvinceManager';
import { provinceTaxYield } from '../../engine/EconomyManager';
import { ECONOMY, PROVINCE_ACTIONS } from '../../data/economy/economyRules';
import { costLines } from '../cards/formatCard';

const TAX_LEVELS: TaxLevel[] = ['low', 'normal', 'high'];
const TAX_LABEL: Record<TaxLevel, string> = { low: 'Low', normal: 'Normal', high: 'High' };

interface Props {
  state: GameState;
  province: Province;
  dispatch: Dispatch<GameAction>;
}

/** Tax policy for a province the player rules. */
export function TaxControl({ state, province, dispatch }: Props) {
  const stabilityEffect = ECONOMY.taxStabilityEffect[province.taxLevel];
  const ongoing = state.status === 'ongoing';
  return (
    <div className="pp-block">
      <div className="pp-block__head">
        <span className="pp-label">{tr('Tax level')}</span>
        <span className="small">
          {provinceTaxYield(province, state.year).toFixed(1)} {tr('gold/yr')}
          {stabilityEffect !== 0 && (
            <span className={stabilityEffect > 0 ? 'pos' : 'neg'}>
              {' · '}
              {stabilityEffect > 0 ? '+' : '−'}
              {Math.abs(stabilityEffect)} {tr('stability/yr')}
            </span>
          )}
        </span>
      </div>
      <div className="segmented" role="radiogroup" aria-label={tr('Tax level')}>
        {TAX_LEVELS.map((level) => (
          <button
            key={level}
            role="radio"
            aria-checked={province.taxLevel === level}
            className={`segmented__option ${province.taxLevel === level ? 'segmented__option--active' : ''}`}
            disabled={!ongoing}
            onClick={() => dispatch({ type: 'SET_TAX_LEVEL', provinceId: province.id, level })}
          >
            {tr(TAX_LABEL[level])}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A list of province improvements (one improvement per province per year). */
export function ImprovementList({ state, province, dispatch, kinds }: Props & { kinds: ProvinceActionKind[] }) {
  return (
    <ul className="action-list">
      {kinds.map((kind) => {
        const check = checkProvinceAction(state, province.id, kind);
        const info = PROVINCE_ACTIONS[kind];
        return (
          <li key={kind} className="action-row">
            <button
              className="btn btn--secondary btn--small action-row__btn"
              disabled={!check.ok}
              onClick={() => dispatch({ type: 'PROVINCE_ACTION', provinceId: province.id, action: kind })}
            >
              {tr(info.label)}
              <span className="action-row__cost">{costLines(check.cost).map((c) => tr(c.text)).join(' ')}</span>
            </button>
            <span className="action-row__desc">{tr(check.ok ? info.description : check.reason)}</span>
          </li>
        );
      })}
    </ul>
  );
}
