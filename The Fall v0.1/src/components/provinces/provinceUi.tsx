/** Presentation-only wording for a 0–100 stability value. */
export function stabilityWord(v: number): string {
  if (v >= 60) return 'Loyal';
  if (v >= 40) return 'Uneasy';
  if (v >= 20) return 'Restless';
  return 'Rebellious';
}

/** Small diamond pips for levels such as development and fortification. */
export function Pips({ value, max }: { value: number; max: number }) {
  return (
    <span className="pips" aria-label={`${value} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip ${i < value ? 'pip--on' : ''}`} />
      ))}
    </span>
  );
}

/** A thin stability meter. */
export function MiniBar({ value, danger = 35 }: { value: number; danger?: number }) {
  return (
    <span className="minibar" aria-hidden>
      <span className={`minibar__fill ${value < danger ? 'minibar__fill--danger' : ''}`} style={{ width: `${value}%` }} />
    </span>
  );
}
