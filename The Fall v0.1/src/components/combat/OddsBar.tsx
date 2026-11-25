import { tr } from '../../i18n/i18n';
/** Visualises the chance of victory computed by the combat engine. */
export function OddsBar({ chance }: { chance: number }) {
  const pct = Math.round(chance * 100);
  const word = pct >= 100 ? 'Certain victory' : pct >= 70 ? 'Favourable' : pct >= 40 ? 'Uncertain' : pct > 0 ? 'Grim' : 'Hopeless';
  return (
    <div className="odds">
      <div className="odds__row">
        <span>{tr('Chance of victory')}</span>
        <strong>
          {pct}% · {tr(word)}
        </strong>
      </div>
      <div className="progress progress--light">
        <div className={`progress__fill ${pct < 40 ? 'progress__fill--danger' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
