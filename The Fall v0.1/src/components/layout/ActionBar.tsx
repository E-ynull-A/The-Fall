import { tr } from '../../i18n/i18n';

interface ActionBarProps {
  canEndYear: boolean;
  endYearHint: string;
  onEndYear: () => void;
  onMenu: () => void;
}

/** Turn controls. Kingdom, military and diplomacy live in the left navigation. */
export function ActionBar({ canEndYear, endYearHint, onEndYear, onMenu }: ActionBarProps) {
  return (
    <nav className="actionbar" aria-label={tr('Main actions')}>
      <button className="btn btn--ghost" onClick={onMenu}>
        {tr('Menu')}
      </button>
      <button className="btn btn--primary btn--end-year" onClick={onEndYear} disabled={!canEndYear} title={endYearHint}>
        {tr('End Year')}
      </button>
    </nav>
  );
}
