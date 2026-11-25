import type { NavSectionId } from './navConfig';

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Engraved line icons for the navigation rail. */
export function NavIcon({ id }: { id: NavSectionId | 'menu' | 'focus' }) {
  switch (id) {
    case 'menu':
      return (
        <svg {...base} width={26} height={26} strokeWidth={2}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'focus':
      return (
        <svg {...base}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      );
    case 'kingdom':
      return (
        <svg {...base}>
          <path d="M3 18h18L19 7l-4 5-3-7-3 7-4-5z" />
          <path d="M4 21h16" />
        </svg>
      );
    case 'provinces':
      return (
        <svg {...base}>
          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case 'economy':
      return (
        <svg {...base}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        </svg>
      );
    case 'military':
      return (
        <svg {...base}>
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
          <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
          <path d="M11 19l-6-6M8 16l-4 4M5 21l-2-2" />
        </svg>
      );
    case 'diplomacy':
      return (
        <svg {...base}>
          <path d="M12 3v18M5 7h14" />
          <path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
        </svg>
      );
    case 'politics':
      return (
        <svg {...base}>
          <path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10" />
          <path d="M2 10l10-6 10 6z" />
        </svg>
      );
    case 'events':
      return (
        <svg {...base}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v4h4" />
          <path d="M12.5 10v5M12.5 18v.3" />
        </svg>
      );
    case 'objectives':
      return (
        <svg {...base}>
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </svg>
      );
  }
}
