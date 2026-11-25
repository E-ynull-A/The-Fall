import { useEffect, useReducer } from 'react';
import type { NavMode, NavSectionId } from './navConfig';

/**
 * Navigation UI state, kept apart from GameState (never saved with the campaign).
 * The mode and open section are remembered for the browser session.
 */
export interface NavState {
  mode: NavMode;
  activeSection: NavSectionId;
}

export type NavAction =
  /** The main (hamburger) button: Expanded ↔ Compact; from Map Focus it restores Expanded. */
  | { type: 'TOGGLE_MAIN' }
  | { type: 'SET_MODE'; mode: NavMode }
  /** Open a category; clicking the open category in Expanded mode collapses the panel. */
  | { type: 'OPEN_SECTION'; id: NavSectionId; toggle?: boolean };

const KEY = 'thefall.nav';
const DEFAULT: NavState = { mode: 'expanded', activeSection: 'kingdom' };

function load(): NavState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<NavState>;
    const mode = parsed.mode === 'compact' || parsed.mode === 'mapFocus' || parsed.mode === 'expanded' ? parsed.mode : DEFAULT.mode;
    return { mode, activeSection: (parsed.activeSection as NavSectionId) ?? DEFAULT.activeSection };
  } catch {
    return DEFAULT;
  }
}

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'TOGGLE_MAIN':
      return { ...state, mode: state.mode === 'expanded' ? 'compact' : 'expanded' };
    case 'SET_MODE':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case 'OPEN_SECTION':
      if (action.toggle && state.mode === 'expanded' && state.activeSection === action.id) return { ...state, mode: 'compact' };
      return { mode: 'expanded', activeSection: action.id };
  }
}

export function useNavigation() {
  const [nav, dispatchNav] = useReducer(navReducer, undefined, load);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(nav));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }, [nav]);
  return [nav, dispatchNav] as const;
}
