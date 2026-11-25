import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { Province } from '../../types/province';
import { computeEconomy, provinceTaxYield } from '../../engine/EconomyManager';
import { getAllObjectiveProgress } from '../../engine/ObjectiveManager';
import { kingdomModifiers } from '../sidebar/KingdomSection';
import { MiniBar, stabilityWord } from '../provinces/provinceUi';
import type { NavSectionId } from './navConfig';

interface Props {
  state: GameState;
  selected: Province | undefined;
  onOpen: (id: NavSectionId) => void;
}

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

/**
 * Compact right-hand status strip: only what matters right now. Each row opens
 * the navigation category that holds the details.
 */
export function StatusRail({ state, selected, onOpen }: Props) {
  const me = state.playerKingdomId;
  const economy = computeEconomy(state, me);
  const primary = getAllObjectiveProgress(state).find((o) => o.definition.id === state.primaryObjectiveId);
  const wars = state.relations.filter((r) => (r.kingdomA === me || r.kingdomB === me) && r.stance === 'war').length;
  const crises = state.activeEvents.length;
  const warnings = kingdomModifiers(state, economy).filter((m) => m.tone === 'bad');
  const besieged = state.sieges.filter((s) => state.provinces[s.provinceId]?.ownerId === me);

  const Row = ({ label, value, tone, to }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn'; to: NavSectionId }) => (
    <li>
      <button className="srow" onClick={() => onOpen(to)} title={tr(label)}>
        <span className="srow__label">{tr(label)}</span>
        <span className={`srow__value ${tone ? `srow__value--${tone}` : ''}`}>{value}</span>
      </button>
    </li>
  );

  return (
    <aside className="status" aria-label={tr('Kingdom status')}>
      <ul className="status__list">
        <Row label="Annual gold" value={signed(economy.netGold)} tone={economy.netGold < 0 ? 'bad' : 'good'} to="economy" />
        <Row label="Annual food" value={signed(economy.netFood)} tone={economy.netFood < 0 ? 'bad' : 'good'} to="economy" />
        <Row label="Active crises" value={`${crises}`} tone={crises > 0 ? 'bad' : undefined} to="events" />
        <Row label="Current wars" value={`${wars}`} tone={wars > 0 ? 'bad' : undefined} to="diplomacy" />
        {primary && (
          <Row
            label="Objective"
            value={primary.state?.status === 'completed' ? '✓' : `${primary.progress.current}/${primary.progress.target}`}
            tone={primary.state?.status === 'completed' ? 'good' : undefined}
            to="objectives"
          />
        )}
      </ul>

      {(warnings.length > 0 || besieged.length > 0) && (
        <ul className="status__warn">
          {besieged.map((s) => (
            <li key={s.id}>
              <button className="swarn" onClick={() => onOpen('military')}>
                {tr(`Under siege by ${state.kingdoms[s.attackerId]?.shortName} (${s.army} troops).`)} · {state.provinces[s.provinceId]?.name}
              </button>
            </li>
          ))}
          {warnings.slice(0, 3).map((w) => (
            <li key={w.text}>
              <button className="swarn" onClick={() => onOpen('kingdom')}>
                {tr(w.text)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="status__prov" style={{ ['--realm' as string]: state.kingdoms[selected.ownerId]?.color }}>
          <div className="status__prov-name">
            {selected.isCapital && '♛ '}
            {selected.name}
          </div>
          <div className="acc__muted">{tr(state.kingdoms[selected.ownerId]!.name)}</div>
          <div className="pstab">
            <span>{tr('Stability')}</span>
            <MiniBar value={selected.stability} />
            <span className="pstab__val">
              {selected.stability} · {tr(stabilityWord(selected.stability))}
            </span>
          </div>
          <div className="acc__muted">
            {provinceTaxYield(selected, state.year).toFixed(1)} {tr('gold/yr')} · {selected.foodProduction} {tr('food')}
          </div>
          <button className="acc__link" onClick={() => onOpen('provinces')}>
            {tr('Province details')} →
          </button>
        </div>
      )}
    </aside>
  );
}
