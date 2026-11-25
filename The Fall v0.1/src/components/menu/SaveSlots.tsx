import { tr } from '../../i18n/i18n';
import type { SaveSummary, SlotId } from '../../services/SaveService';
import { SLOTS } from '../../services/SaveService';

interface Props {
  saves: (SaveSummary | null)[];
  onLoad?: (slot: SlotId) => void;
  onSave?: (slot: SlotId) => void;
  onDelete?: (slot: SlotId) => void;
}

const SLOT_NAME: Record<SlotId, string> = { auto: 'Autosave', slot1: 'Slot I', slot2: 'Slot II', slot3: 'Slot III' };

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Save slots, used both on the title screen (load) and in-game (save/load). */
export function SaveSlots({ saves, onLoad, onSave, onDelete }: Props) {
  return (
    <ul className="slots">
      {SLOTS.map((slot, i) => {
        const save = saves[i] ?? null;
        const canSave = onSave && slot !== 'auto';
        return (
          <li key={slot} className="slot">
            <div className="slot__info">
              <span className="slot__name">{tr(SLOT_NAME[slot])}</span>
              {save ? (
                <span className="slot__meta">
                  {tr(save.label)} · {save.status !== 'ongoing' ? `${save.status} · ` : ''}{tr('saved')}{' '}{when(save.savedAt)}
                </span>
              ) : (
                <span className="slot__meta slot__meta--empty">{tr('Empty')}</span>
              )}
            </div>
            <div className="slot__actions">
              {canSave && (
                <button className="btn btn--small btn--secondary" onClick={() => onSave(slot)}>{tr('Save here')}</button>
              )}
              {onLoad && (
                <button className="btn btn--small btn--primary" disabled={!save} onClick={() => onLoad(slot)}>{tr('Load')}</button>
              )}
              {onDelete && save && slot !== 'auto' && (
                <button className="btn btn--small btn--ghost" onClick={() => onDelete(slot)} aria-label={`Delete ${tr(SLOT_NAME[slot])}`}>{tr('Delete')}</button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
