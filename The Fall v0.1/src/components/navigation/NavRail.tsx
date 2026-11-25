import { useEffect, useState } from 'react';
import { tr } from '../../i18n/i18n';
import { NAV_SECTIONS, type NavSectionId } from './navConfig';
import type { NavAction, NavState } from './useNavigation';
import { NavIcon } from './NavIcons';

const HINT_KEY = 'thefall.navHintSeen';

interface Props {
  nav: NavState;
  dispatchNav: (a: NavAction) => void;
  /** Small counters shown on category icons (e.g. pending events). */
  badges: Partial<Record<NavSectionId, { text: string; tone: 'bad' | 'warn' | 'good' }>>;
}

/** The permanent left icon rail with the main menu button. Hidden in Map Focus mode. */
export function NavRail({ nav, dispatchNav, badges }: Props) {
  const expanded = nav.mode === 'expanded';
  const [hint, setHint] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) !== '1';
    } catch {
      return false;
    }
  });

  const dismissHint = () => {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  // The first-visit hint fades on its own after a few seconds.
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(dismissHint, 9000);
    return () => window.clearTimeout(t);
  }, [hint]);

  return (
    <nav className={`navrail ${expanded ? 'navrail--expanded' : ''}`} aria-label={tr('Main navigation')}>
      <div className="navrail__top">
        <button
          className="navrail__menu"
          aria-label={tr('Main menu')}
          aria-expanded={expanded}
          aria-controls="nav-panel"
          data-tip={tr('Main menu')}
          onClick={() => {
            dismissHint();
            dispatchNav({ type: 'TOGGLE_MAIN' });
          }}
        >
          <NavIcon id="menu" />
          <span className="navrail__label navrail__label--menu">{tr('Main menu')}</span>
        </button>
        {hint && (
          <div className="navhint" role="status">
            <span>{tr('Open the main navigation here.')}</span>
            <button className="navhint__close" onClick={dismissHint} aria-label={tr('Close')}>
              ×
            </button>
          </div>
        )}
      </div>

      <ul className="navrail__list">
        {NAV_SECTIONS.map((s) => {
          const active = expanded && nav.activeSection === s.id;
          const badge = badges[s.id];
          return (
            <li key={s.id}>
              <button
                className={`navrail__item ${active ? 'navrail__item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={tr(s.label)}
                data-tip={`${tr(s.label)} — ${tr(s.hint)}`}
                onClick={() => dispatchNav({ type: 'OPEN_SECTION', id: s.id, toggle: true })}
              >
                <NavIcon id={s.id} />
                <span className="navrail__label">{tr(s.label)}</span>
                {badge && <span className={`navrail__badge navrail__badge--${badge.tone}`}>{badge.text}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="navrail__bottom">
        <button
          className="navrail__item"
          aria-label={tr('Map focus')}
          data-tip={tr('Map focus — hide navigation')}
          onClick={() => dispatchNav({ type: 'SET_MODE', mode: 'mapFocus' })}
        >
          <NavIcon id="focus" />
          <span className="navrail__label">{tr('Map focus')}</span>
        </button>
      </div>
    </nav>
  );
}

/** Restores navigation from Map Focus mode; sits on the map's left edge. */
export function MapFocusRestore({ dispatchNav }: { dispatchNav: (a: NavAction) => void }) {
  return (
    <button
      className="focus-restore"
      aria-label={tr('Show navigation')}
      title={tr('Show navigation')}
      onClick={() => dispatchNav({ type: 'SET_MODE', mode: 'compact' })}
    >
      <NavIcon id="menu" />
      <span className="focus-restore__label">{tr('Menu')}</span>
    </button>
  );
}
