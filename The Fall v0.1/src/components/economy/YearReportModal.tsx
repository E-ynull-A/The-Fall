import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import { RESOURCE_KEYS } from '../../engine/ResourceManager';
import { Modal } from '../common/Modal';
import { RESOURCE_LABELS } from '../resources/ResourceStat';
import { BudgetTable } from './BudgetTable';

/** Shown after End Year: what the new year brought. */
export function YearReportModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const report = state.lastYearReport;
  if (!report) return null;
  const changes = RESOURCE_KEYS.filter((k) => (report.resourceChange[k] ?? 0) !== 0);

  return (
    <Modal
      title={`Anno Domini ${report.year}`}
      subtitle={tr('The stewards present their accounts')}
      onClose={onClose}
      tone={report.famine || report.unpaidArmy ? 'grave' : 'default'}
      footer={
        <button className="btn btn--primary" onClick={onClose}>{tr('Continue')}</button>
      }
    >
      <div className="report-changes">
        {changes.length === 0 ? (
          <p className="muted">{tr('Nothing changed in the realm’s stores.')}</p>
        ) : (
          changes.map((k) => {
            const v = report.resourceChange[k] as number;
            return (
              <span key={k} className={`delta-chip ${v > 0 ? 'delta-chip--up' : 'delta-chip--down'}`}>
                {v > 0 ? '+' : '−'}
                {Math.abs(v)} {tr(RESOURCE_LABELS[k])}
              </span>
            );
          })
        )}
      </div>
      {report.notes.length > 0 && (
        <ul className="warnings">
          {report.notes.map((n) => (
            <li key={n}>{tr(n)}</li>
          ))}
        </ul>
      )}
      {report.worldNotes.length > 0 && (
        <>
          <h3 className="modal__section">{tr('News from the realm')}</h3>
          <ul className="report-notes">
            {report.worldNotes.map((n, i) => (
              <li key={i}>{tr(n)}</li>
            ))}
          </ul>
        </>
      )}
      <h3 className="modal__section">{tr('The accounts')}</h3>
      <BudgetTable economy={report.economy} />
    </Modal>
  );
}
