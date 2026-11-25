import { tr } from '../../i18n/i18n';
import { useEffect } from 'react';
import { playSound } from '../../services/AudioService';
import type { GameState } from '../../types/game';
import type { BattleReport } from '../../types/military';
import { TACTICS } from '../../data/military/militaryRules';
import { Modal } from '../common/Modal';

const TITLE: Record<BattleReport['outcome'], string> = {
  victory: 'Victory',
  defeat: 'Defeat',
  retreat: 'Withdrawal',
  siege_started: 'The Siege Begins',
};

export function BattleReportModal({ state, report, onClose }: { state: GameState; report: BattleReport; onClose: () => void }) {
  const attacker = state.kingdoms[report.attackerId]!;
  useEffect(() => playSound(report.outcome === 'siege_started' || report.outcome === 'retreat' ? 'click' : 'battle'), [report.id]);
  const defender = state.kingdoms[report.defenderId]!;
  const p = state.provinces[report.provinceId]!;
  const playerWon = (report.outcome === 'victory') === (attacker.isPlayer);
  const fought = report.outcome === 'victory' || report.outcome === 'defeat';

  return (
    <Modal
      title={`${tr(TITLE[report.outcome])} at ${tr(p.name)}`}
      subtitle={`${attacker.shortName} against ${defender.shortName} · ${tr(TACTICS[report.tactic].label)}`}
      tone={fought && !playerWon ? 'grave' : 'default'}
      onClose={onClose}
      footer={
        <button className="btn btn--primary" onClick={onClose}>{tr('Continue')}</button>
      }
    >
      {fought && (
        <table className="ledger__table battle-table">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">{attacker.shortName}</th>
              <th scope="col">{defender.shortName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{tr('Strength on the day')}</th>
              <td>{report.attackerPower}</td>
              <td>{report.defenderPower}</td>
            </tr>
            <tr>
              <th scope="row">{tr('Losses')}</th>
              <td className="down">{report.attackerLosses}</td>
              <td className="down">{report.defenderLosses}</td>
            </tr>
          </tbody>
        </table>
      )}
      <ul className="report-notes">
        {report.notes.map((n) => (
          <li key={n}>{tr(n)}</li>
        ))}
      </ul>
      {report.captured && attacker.isPlayer && (
        <p className="notice">{tr('Conquered land does not love its new lord.')}{' '}{tr(p.name)}{' '}{tr('starts at stability')}{' '}{p.stability}{tr(', pays half its taxes for three years and adds to your administration costs.')}</p>
      )}
    </Modal>
  );
}
