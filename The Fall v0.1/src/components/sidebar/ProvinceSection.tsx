import type { Dispatch, ReactNode } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { Province, ProvinceId } from '../../types/province';
import type { GameAction } from '../../engine/GameEngine';
import { PROVINCE_TYPES } from '../../data/provinces/provinceTypes';
import { PROVINCE_TRAITS } from '../../data/provinces/traits';
import { MILITARY } from '../../data/military/militaryRules';
import { getProvincesOwnedBy, isFrontier } from '../../engine/selectors';
import { checkAttack, defenderStrength } from '../../engine/CombatManager';
import { provinceFoodConsumption, provinceTaxYield } from '../../engine/EconomyManager';
import { TypeIcon } from '../map/TypeIcon';
import { ImprovementList, TaxControl } from '../provinces/ProvinceActions';
import { RecruitRow } from '../provinces/RecruitRow';
import { MiniBar, Pips, stabilityWord } from '../provinces/provinceUi';

interface Props {
  state: GameState;
  selected: Province | undefined;
  dispatch: Dispatch<GameAction>;
  onSelect: (id: ProvinceId | null) => void;
  onAttack: (id: ProvinceId) => void;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pgroup">
      <h3 className="acc__sub">{tr(title)}</h3>
      {children}
    </div>
  );
}

/** Province list when nothing is selected; the selected province's details otherwise. */
export function ProvinceSection({ state, selected, dispatch, onSelect, onAttack }: Props) {
  if (!selected) {
    const own = getProvincesOwnedBy(state, state.playerKingdomId);
    return (
      <>
        <p className="acc__muted">{tr('Select a province on the map, or one of yours below.')}</p>
        <ul className="plist">
          {own.map((p) => (
            <li key={p.id}>
              <button className="plist__row" onClick={() => onSelect(p.id)}>
                <span className={`plist__icon type-tint--${p.type}`}>
                  <TypeIcon type={p.type} size={18} />
                </span>
                <span className="plist__name">
                  {p.isCapital && '♛ '}
                  {p.name}
                </span>
                <MiniBar value={p.stability} />
                <span className="plist__num">{p.stability}</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const p = selected;
  const owner = state.kingdoms[p.ownerId]!;
  const isOwn = p.ownerId === state.playerKingdomId;
  const claimed = !isOwn && p.historicalOwnerId === state.playerKingdomId;
  const siege = state.sieges.find((s) => s.provinceId === p.id);
  const eats = provinceFoodConsumption(p);
  const occupiedUntil =
    p.conqueredYear !== null && state.year - p.conqueredYear < MILITARY.occupationYears ? p.conqueredYear + MILITARY.occupationYears - 1 : null;
  const military = state.kingdoms[state.playerKingdomId]!.resources.military;
  const attack = isOwn ? null : checkAttack(state, state.playerKingdomId, p.id, Math.max(1, military));

  return (
    <>
      <div className="phead" style={{ ['--realm' as string]: owner.color }}>
        <span className={`phead__icon type-tint--${p.type}`}>
          <TypeIcon type={p.type} size={26} />
        </span>
        <div className="phead__text">
          <div className="phead__name">
            {p.isCapital && <span className="phead__crown">♛ </span>}
            {p.name}
          </div>
          <div className="phead__meta">
            <span className="legend__swatch" style={{ background: owner.color }} />
            {tr(owner.name)} · {tr(PROVINCE_TYPES[p.type].label)}
          </div>
        </div>
        <button className="icon-btn icon-btn--small" onClick={() => onSelect(null)} aria-label={tr('Close province panel')}>
          ×
        </button>
      </div>

      <div className="pstab">
        <span>{tr('Stability')}</span>
        <MiniBar value={p.stability} />
        <span className="pstab__val">
          {p.stability} · {tr(stabilityWord(p.stability))}
        </span>
      </div>

      <dl className="kv kv--grid">
        <div>
          <dt>{tr('Income')}</dt>
          <dd>
            {provinceTaxYield(p, state.year).toFixed(1)} {tr('gold/yr')}
          </dd>
        </div>
        <div>
          <dt>{tr('Production')}</dt>
          <dd>
            {p.foodProduction} / {eats} {tr('food')}
          </dd>
        </div>
        <div>
          <dt>{tr('Garrison')}</dt>
          <dd>{p.garrison}</dd>
        </div>
        <div>
          <dt>{tr('Fortification')}</dt>
          <dd>
            <Pips value={p.fortification} max={3} />
          </dd>
        </div>
        <div>
          <dt>{tr('Development')}</dt>
          <dd>
            <Pips value={p.development} max={5} />
          </dd>
        </div>
        <div>
          <dt>{tr('Defense strength')}</dt>
          <dd>{defenderStrength(state, p.id).toFixed(1)}</dd>
        </div>
      </dl>

      {(claimed || siege || occupiedUntil !== null || p.traits.length > 0 || isFrontier(state, p.id)) && (
        <div className="tags">
          {claimed && <span className="tag tag--claim">{tr('Ancestral claim')}</span>}
          {siege && (
            <span className="tag tag--bad">
              {tr(`Under siege by ${state.kingdoms[siege.attackerId]?.shortName} (${siege.army} troops).`)}
            </span>
          )}
          {occupiedUntil !== null && <span className="tag tag--warn">{tr(`Occupation: half taxes until ${occupiedUntil}`)}</span>}
          {isFrontier(state, p.id) && <span className="tag">{tr('frontier province')}</span>}
          {p.traits.map((t) => (
            <span key={t} className="tag" title={tr(PROVINCE_TRAITS[t]?.description)}>
              {tr(PROVINCE_TRAITS[t]?.name ?? t)}
            </span>
          ))}
        </div>
      )}

      {isOwn ? (
        <>
          <Group title="Economy">
            <TaxControl state={state} province={p} dispatch={dispatch} />
          </Group>
          <Group title="Improvements · one per year">
            <ImprovementList
              state={state}
              province={p}
              dispatch={dispatch}
              kinds={['develop_infrastructure', 'improve_food', 'build_defenses', 'suppress_unrest']}
            />
          </Group>
          <Group title="Raise troops · once per year">
            <RecruitRow state={state} province={p} dispatch={dispatch} />
          </Group>
        </>
      ) : (
        <Group title="Actions">
          <button className="btn btn--primary btn--small" disabled={!attack?.ok} onClick={() => onAttack(p.id)}>
            {tr(attack?.ok && attack.startsSiege ? 'Lay siege' : 'Attack')}
          </button>
          <p className="acc__muted">{tr(attack?.ok ? 'Borders your realm.' : (attack && !attack.ok ? attack.reason : ''))}</p>
        </Group>
      )}
    </>
  );
}
