import { tr } from '../../i18n/i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../types/game';
import type { ChronicleEntry } from '../../types/event';
import { playSound, type SoundCue } from '../../services/AudioService';
import { RESOURCE_KEYS } from '../../engine/ResourceManager';
import { RESOURCE_LABELS } from '../resources/ResourceStat';

const SHOWN: ChronicleEntry['kind'][] = ['card', 'turn', 'battle', 'diplomacy', 'event'];
const CUE: Partial<Record<ChronicleEntry['kind'], SoundCue>> = {
  card: 'card',
  turn: 'coin',
  battle: 'battle',
  diplomacy: 'click',
  event: 'click',
};

interface Toast {
  id: string;
  kind: ChronicleEntry['kind'];
  message: string;
  /** Resource changes caused by the action, e.g. "Qızıl −8 · Ordu +4". */
  deltas?: string;
}

/**
 * Brief notices for what the player's last action did. Reads new chronicle entries;
 * End Year has its own report, so entries created by a year change are not toasted.
 */
export function Toasts({ state }: { state: GameState }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef(new Set(state.chronicle.map((c) => c.id)));
  const year = useRef(state.year);
  const resources = useRef(state.kingdoms[state.playerKingdomId]!.resources);

  useEffect(() => {
    const fresh = state.chronicle.filter((c) => !seen.current.has(c.id));
    fresh.forEach((c) => seen.current.add(c.id));
    const yearChanged = year.current !== state.year;
    year.current = state.year;
    const before = resources.current;
    const after = state.kingdoms[state.playerKingdomId]!.resources;
    resources.current = after;
    const deltas = RESOURCE_KEYS.filter((k) => after[k] !== before[k])
      .map((k) => `${tr(RESOURCE_LABELS[k])} ${after[k] - before[k] > 0 ? '+' : '−'}${Math.abs(after[k] - before[k])}`)
      .join(' · ');
    if (yearChanged || fresh.length === 0) return;
    const shown = fresh.filter((c) => SHOWN.includes(c.kind)).slice(-3);
    if (shown.length === 0) return;
    const cue = CUE[shown[shown.length - 1]!.kind];
    if (cue) playSound(cue);
    setToasts((t) =>
      [...t, ...shown.map((c, i) => ({ id: c.id, kind: c.kind, message: c.message, deltas: i === shown.length - 1 && deltas ? deltas : undefined }))].slice(-4),
    );
    const ids = shown.map((c) => c.id);
    const timer = window.setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 4000);
    return () => window.clearTimeout(timer);
  }, [state.chronicle, state.year]);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {tr(t.message)}
          {t.deltas && <div className="toast__deltas">{t.deltas}</div>}
        </div>
      ))}
    </div>
  );
}
