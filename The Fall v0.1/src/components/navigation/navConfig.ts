/** Strongly typed navigation definitions. Labels are English keys translated through tr(). */

export type NavMode = 'expanded' | 'compact' | 'mapFocus';

export type NavSectionId = 'kingdom' | 'provinces' | 'economy' | 'military' | 'diplomacy' | 'politics' | 'events' | 'objectives';

export interface NavSectionDef {
  id: NavSectionId;
  label: string;
  /** One-line description used in tooltips. */
  hint: string;
}

export const NAV_SECTIONS: readonly NavSectionDef[] = [
  { id: 'kingdom', label: 'Kingdom', hint: 'Kingdom overview, status and modifiers' },
  { id: 'provinces', label: 'Provinces', hint: 'Province management, taxation and development' },
  { id: 'economy', label: 'Economy', hint: 'Income, expenses, food and tax policy' },
  { id: 'military', label: 'Military', hint: 'Recruitment, attacks, sieges and defense' },
  { id: 'diplomacy', label: 'Diplomacy', hint: 'Relations, alliances, peace and war' },
  { id: 'politics', label: 'Politics', hint: 'Legitimacy, order and internal decisions' },
  { id: 'events', label: 'Events', hint: 'Crises, decisions and the chronicle' },
  { id: 'objectives', label: 'Objectives', hint: 'Campaign objectives, progress and rewards' },
];
