import { tr } from '../../i18n/i18n';
import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Framed section with a manuscript-style heading. */
export function Panel({ title, aside, children, className }: PanelProps) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <header className="panel__header">
        <h2 className="panel__title">{tr(title)}</h2>
        {aside}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** Marks UI that exists but whose system arrives in a later development phase. */
export function PhaseBadge({ phase, label }: { phase: number; label?: string }) {
  return (
    <span className="phase-badge" title={`This system is implemented in Phase ${phase}`}>
      {label ? `${label} · ` : ''}{tr('Phase')}{' '}{phase}
    </span>
  );
}
