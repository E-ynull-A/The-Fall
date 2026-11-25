import { tr } from '../../i18n/i18n';
import { useState, type Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { Tactic } from '../../types/military';
import type { GameAction } from '../../engine/GameEngine';
import { checkAttack, estimateBattle, isImportantBattle } from '../../engine/CombatManager';
import { MILITARY, TACTICS } from '../../data/military/militaryRules';
import { PROVINCE_TYPES } from '../../data/provinces/provinceTypes';
import { Modal } from '../common/Modal';
import { OddsBar } from './OddsBar';

const CHOICES: Tactic[] = ['aggressive', 'defensive', 'flanking', 'retreat'];

interface Props {
  state: GameState;
  provinceId: ProvinceId;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
  onResolved: () => void;
}

/** Prepare an attack: commit troops, read the odds, choose a tactic for important battles. */
export function AttackDialog({ state, provinceId, dispatch, onClose, onResolved }: Props) {
  const player = state.kingdoms[state.playerKingdomId]!;
  const p = state.provinces[provinceId]!;
  const owner = state.kingdoms[p.ownerId]!;
  const max = player.resources.military;
  const [committed, setCommitted] = useState(Math.max(1, max));
  const important = isImportantBattle(state, player.id, provinceId, committed);
  const [tactic, setTactic] = useState<Tactic>('aggressive');
  const chosen: Tactic = important ? tactic : 'balanced';
  const check = checkAttack(state, player.id, provinceId, committed);
  const est = estimateBattle(state, player.id, provinceId, committed, chosen);
  const siege = check.ok && check.startsSiege;

  const confirm = () => {
    if (!check.ok) return;
    dispatch({ type: 'ATTACK', provinceId, committed, tactic: chosen });
    onResolved();
  };

  return (
    <Modal
      title={`March on ${tr(p.name)}`}
      subtitle={`${tr(PROVINCE_TYPES[p.type].label)} held by ${tr(owner.name)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost-dark" onClick={onClose}>{tr('Cancel')}</button>
          <button className="btn btn--primary" disabled={!check.ok} onClick={confirm}>
            {tr(siege && chosen !== 'retreat' ? 'Begin siege' : 'Attack')}
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">{tr('Commit troops:')}{' '}<strong>{committed}</strong>{' '}{tr('of')}{' '}{max}
        </span>
        <input
          type="range"
          min={1}
          max={Math.max(1, max)}
          value={committed}
          disabled={max < 1}
          onChange={(e) => setCommitted(Number(e.target.value))}
        />
      </label>

      <dl className="battle-facts">
        <div>
          <dt>{tr('Defenders')}</dt>
          <dd>{tr('garrison')}{' '}{p.garrison}{tr(', fortification')}{' '}{p.fortification}{tr('/3, plus part of')}{' '}{owner.shortName}{tr('’s army')}</dd>
        </div>
        <div>
          <dt>{tr('Your strength')}</dt>
          <dd>{est.attack.toFixed(1)}</dd>
        </div>
        <div>
          <dt>{tr('Their strength')}</dt>
          <dd>{est.defense.toFixed(1)}</dd>
        </div>
      </dl>

      {siege ? (
        <p className="notice">{tr('The walls are too strong to storm at once (fortification')}{' '}{MILITARY.siegeFortification}{tr('+). Your army will lay siege. Each year the walls fall by one level and the garrison starves, and you may assault at any time.')}</p>
      ) : (
        <OddsBar chance={est.chance} />
      )}

      {important ? (
        <fieldset className="tactics">
          <legend>{tr('This battle matters. Choose your tactic:')}</legend>
          {CHOICES.map((t) => (
            <label key={t} className={`tactic ${tactic === t ? 'tactic--active' : ''}`}>
              <input type="radio" name="tactic" value={t} checked={tactic === t} onChange={() => setTactic(t)} />
              <span className="tactic__name">{tr(TACTICS[t].label)}</span>
              <span className="tactic__desc">{tr(TACTICS[t].description)}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="muted small">{tr('A routine engagement: your captains will fight it as a balanced advance.')}</p>
      )}

      {check.ok && check.breaksPeace && (
        <p className="notice notice--grave">{tr('You are at peace with')}{' '}{owner.shortName}{tr('. Attacking declares war: −')}{MILITARY.breakPeaceLegitimacy}{' '}{tr('legitimacy and their lasting hostility.')}</p>
      )}
      {!check.ok && <p className="notice notice--grave">{tr(check.reason)}</p>}
    </Modal>
  );
}
