import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { Targeting } from './targeting';

interface Props {
  state: GameState;
  targeting: Targeting;
  picked: ProvinceId | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shown over the top edge of the map while an operation waits for a province. */
export function TargetBar({ state, targeting, picked, onConfirm, onCancel }: Props) {
  const p = picked ? state.provinces[picked] : undefined;
  return (
    <div className="targetbar" role="status">
      <div className="targetbar__text">
        <strong>{tr(targeting.label)}</strong>
        <span>
          {p ? `${p.name} · ${targeting.describe(p.id)}` : tr('Choose a highlighted province on the map.')}
        </span>
      </div>
      <div className="targetbar__actions">
        <button className="btn btn--ghost btn--small" onClick={onCancel}>
          {tr('Cancel')}
        </button>
        <button className="btn btn--primary btn--small" disabled={!p} onClick={onConfirm}>
          {tr('Confirm')}
        </button>
      </div>
    </div>
  );
}
