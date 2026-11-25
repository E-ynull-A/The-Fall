import type { Dispatch } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../engine/GameEngine';
import { getAllObjectiveProgress } from '../../engine/ObjectiveManager';

export function objectivePercent(current: number, target: number): number {
  return target ? Math.min(100, Math.round((current / target) * 100)) : 0;
}

export function ObjectivesSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const all = getAllObjectiveProgress(state);
  const primary = all.find((o) => o.definition.id === state.primaryObjectiveId) ?? all[0];
  if (!primary) return null;
  const pct = objectivePercent(primary.progress.current, primary.progress.target);
  const others = all.filter((o) => o.definition.id !== primary.definition.id);

  return (
    <>
      <label className="acc__sub" htmlFor="objective-select">
        {tr('Primary objective')}
      </label>
      <select
        id="objective-select"
        className="select select--compact"
        value={state.primaryObjectiveId}
        onChange={(e) => dispatch({ type: 'SET_PRIMARY_OBJECTIVE', objectiveId: e.target.value })}
      >
        {all.map((o) => (
          <option key={o.definition.id} value={o.definition.id}>
            {tr(o.definition.name)}
          </option>
        ))}
      </select>
      <p className="acc__text">{tr(primary.definition.description)}</p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={primary.progress.target} aria-valuenow={primary.progress.current}>
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="acc__muted">
        {tr(primary.progress.label)}
        {primary.state?.status === 'completed' && <span className="pos"> · {tr(`Fulfilled in ${primary.state.completedYear}`)}</span>}
        {primary.state?.status === 'failed' && <span className="neg"> · {tr('Failed')}</span>}
      </p>
      <p className="acc__text">
        <strong>{tr('Reward:')}</strong> {tr(primary.definition.reward)}
      </p>

      {others.length > 0 && (
        <>
          <h3 className="acc__sub">{tr('Other ambitions')}</h3>
          <ul className="olist">
            {others.map((o) => {
              const p = objectivePercent(o.progress.current, o.progress.target);
              return (
                <li key={o.definition.id} className={`olist__row olist__row--${o.state?.status ?? 'active'}`}>
                  <span className="olist__name">{tr(o.definition.name)}</span>
                  <span className="minibar" aria-hidden>
                    <span className="minibar__fill" style={{ width: `${p}%` }} />
                  </span>
                  <span className="olist__num">
                    {o.state?.status === 'completed' ? '✓' : o.state?.status === 'failed' ? '✗' : `${p}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
