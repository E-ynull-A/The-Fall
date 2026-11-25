import { tr } from '../../i18n/i18n';
import { useState, type Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { Tactic } from '../../types/military';
import type { GameAction } from '../../engine/GameEngine';
import { attackableProvinces, estimateBattle } from '../../engine/CombatManager';
import { computeEconomy } from '../../engine/EconomyManager';
import { getRelation } from '../../engine/relations';
import { getProvincesOwnedBy } from '../../engine/selectors';
import { TACTICS } from '../../data/military/militaryRules';
import { Modal } from '../common/Modal';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onAttack: (provinceId: ProvinceId) => void;
  onClose: () => void;
  onBattle: () => void;
}

const ASSAULT_TACTICS: Tactic[] = ['aggressive', 'balanced', 'defensive'];

/** The war room: army, sieges, and reachable targets. */
export function MilitaryModal({ state, dispatch, onAttack, onClose, onBattle, bare = false }: Props & { bare?: boolean }) {
  const player = state.kingdoms[state.playerKingdomId]!;
  const economy = computeEconomy(state, player.id);
  const sieges = state.sieges.filter((s) => s.attackerId === player.id);
  const targets = attackableProvinces(state, player.id);
  const garrisons = getProvincesOwnedBy(state, player.id).reduce((s, p) => s + p.garrison, 0);
  const [assaultTactic, setAssaultTactic] = useState<Tactic>('aggressive');
  const enemySieges = state.sieges.filter((s) => state.provinces[s.provinceId]?.ownerId === player.id);

  const body = (
    <>
      <dl className="battle-facts">
        <div>
          <dt>{tr('Field army')}</dt>
          <dd>{player.resources.military}</dd>
        </div>
        <div>
          <dt>{tr('Garrisons')}</dt>
          <dd>{garrisons}</dd>
        </div>
        <div>
          <dt>{tr('Yearly wages')}</dt>
          <dd>
            {economy.armyUpkeep + economy.garrisonUpkeep}{' '}{tr('gold,')}{' '}{economy.foodArmy}{' '}{tr('food')}</dd>
        </div>
      </dl>
      <p className="muted small">{tr('Recruit soldiers and build defenses from a province’s panel.')}</p>

      {enemySieges.length > 0 && (
        <div className="notice notice--grave">
          {enemySieges.map((s) => (
            <div key={s.id}>
              {state.kingdoms[s.attackerId]!.shortName}{' '}{tr('besieges')}{' '}{tr(state.provinces[s.provinceId]!.name)}{' '}{tr('with')}{' '}{s.army}{' '}{tr('troops (year')}{' '}{s.progress + 1}).
            </div>
          ))}
        </div>
      )}

      <h3 className="modal__section">{tr('Your sieges')}</h3>
      {sieges.length === 0 ? (
        <p className="muted small">{tr('None.')}</p>
      ) : (
        <>
          <div className="segmented segmented--light" role="radiogroup" aria-label={tr('Assault tactic')}>
            {ASSAULT_TACTICS.map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={assaultTactic === t}
                className={`segmented__option ${assaultTactic === t ? 'segmented__option--active' : ''}`}
                onClick={() => setAssaultTactic(t)}
              >
                {tr(TACTICS[t].label)}
              </button>
            ))}
          </div>
          <ul className="target-list">
            {sieges.map((s) => {
              const p = state.provinces[s.provinceId]!;
              const walls = Math.max(0, p.fortification - s.progress);
              const est = estimateBattle(state, player.id, p.id, s.army, assaultTactic, walls, s.bonus);
              return (
                <li key={s.id} className="target">
                  <div>
                    <strong>{tr(p.name)}</strong>
                    <span className="muted small">
                      {' '}
                      · {s.army}{' '}{tr('troops · year')}{' '}{s.progress}{' '}{tr('· walls')}{' '}{walls}/{p.fortification}{' '}{tr('· garrison')}{' '}{p.garrison}
                      {s.bonus ? ` · ${tr(`+${s.bonus * 10}% siege works`)}` : ''}
                    </span>
                    <div className="small">{tr('Assault odds:')}{' '}{Math.round(est.chance * 100)}%</div>
                  </div>
                  <div className="target__actions">
                    <button className="btn btn--ghost-dark btn--small" onClick={() => dispatch({ type: 'LIFT_SIEGE', siegeId: s.id })}>{tr('Lift')}</button>
                    <button
                      className="btn btn--primary btn--small"
                      onClick={() => {
                        dispatch({ type: 'ASSAULT_SIEGE', siegeId: s.id, tactic: assaultTactic });
                        onBattle();
                      }}
                    >{tr('Assault')}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3 className="modal__section">{tr('Targets within reach')}</h3>
      <ul className="target-list">
        {targets.map((p) => {
          const owner = state.kingdoms[p.ownerId]!;
          const stance = getRelation(state, player.id, owner.id)?.stance;
          const est = estimateBattle(state, player.id, p.id, Math.max(1, player.resources.military));
          const besieged = state.sieges.some((s) => s.provinceId === p.id);
          return (
            <li key={p.id} className="target" style={{ ['--realm' as string]: owner.color }}>
              <div>
                <strong>{tr(p.name)}</strong>
                <span className="muted small">
                  {' '}
                  · {owner.shortName} ({stance}{tr(') · garrison')}{' '}{p.garrison}{' '}{tr('· walls')}{' '}{p.fortification}
                </span>
                <div className="small">
                  {tr(p.fortification >= 2 ? 'Requires a siege' : `Odds with your whole army: ${Math.round(est.chance * 100)}%`)}
                </div>
              </div>
              <div className="target__actions">
                <button
                  className="btn btn--secondary-dark btn--small"
                  disabled={besieged || player.resources.military < 1 || stance === 'alliance' || stance === 'truce'}
                  onClick={() => onAttack(p.id)}
                >
                  {tr(besieged ? 'Besieged' : stance === 'alliance' ? 'Allied' : stance === 'truce' ? 'Truce' : 'Prepare attack')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
  if (bare) return body;
  return (
    <Modal title={tr('The War Room')} subtitle={`Anno Domini ${state.year}`} onClose={onClose}>
      {body}
    </Modal>
  );
}
