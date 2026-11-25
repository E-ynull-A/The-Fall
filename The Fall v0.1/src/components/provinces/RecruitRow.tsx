import { tr } from '../../i18n/i18n';
import { useState, type Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { Province } from '../../types/province';
import type { GameAction } from '../../engine/GameEngine';
import { checkRecruit } from '../../engine/ProvinceManager';
import { MILITARY } from '../../data/military/militaryRules';
import { costLines } from '../cards/formatCard';

/** Raise troops in a province: up to its recruitment potential, once per year. */
export function RecruitRow({ state, province, dispatch }: { state: GameState; province: Province; dispatch: Dispatch<GameAction> }) {
  const [amount, setAmount] = useState(province.recruitmentPotential);
  const n = Math.min(amount, province.recruitmentPotential);
  const check = checkRecruit(state, province.id, n);

  return (
    <div className="recruit">
      <span className="muted small">{tr('Raise troops · once per year')}</span>
      <div className="recruit__row">
        <div className="stepper" aria-label={tr('Recruits')}>
          <button className="stepper__btn" onClick={() => setAmount(Math.max(1, n - 1))} aria-label={tr('Fewer')}>
            −
          </button>
          <span className="stepper__value">{n}</span>
          <button
            className="stepper__btn"
            onClick={() => setAmount(Math.min(province.recruitmentPotential, n + 1))}
            aria-label={tr('More')}
          >
            +
          </button>
        </div>
        <button
          className="btn btn--secondary btn--small action-row__btn"
          disabled={!check.ok}
          onClick={() => dispatch({ type: 'RECRUIT', provinceId: province.id, amount: n })}
        >{tr('Recruit soldiers')}<span className="action-row__cost">{costLines(check.cost).map((c) => tr(c.text)).join(' ')}</span>
        </button>
      </div>
      <span className="action-row__desc">
        {check.ok
          ? tr(`+${n} military, −${n * MILITARY.recruitStabilityPerStrength} province stability (conscription).`)
          : tr(check.reason)}
      </span>
    </div>
  );
}
