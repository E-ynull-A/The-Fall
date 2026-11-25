import type { ResourceKey } from '../../types/kingdom';

const common = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/**
 * Engraved resource icons for the royal header: a solid tinted body with a dark
 * engraved outline, so they read clearly at small sizes.
 */
export function ResourceIcon({ resource }: { resource: ResourceKey }) {
  switch (resource) {
    case 'gold':
      return (
        <svg {...common}>
          <g fill="currentColor" fillOpacity="0.9" stroke="#3a2a12">
            <path d="M5 16v2.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V16" />
            <ellipse cx="12" cy="16" rx="7" ry="2.5" />
            <path d="M5 11.5V14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-2.5" />
            <ellipse cx="12" cy="11.5" rx="7" ry="2.5" />
            <path d="M5 7v2.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7" />
            <ellipse cx="12" cy="7" rx="7" ry="2.5" />
          </g>
        </svg>
      );
    case 'food':
      return (
        <svg {...common}>
          <path d="M12 22V9" stroke="currentColor" strokeWidth="1.8" />
          <g fill="currentColor" stroke="#3a2a12" strokeWidth="0.8" transform="translate(12 12) scale(1.3) translate(-12 -12.5)">
            <path d="M12 9c-1.6-1-2.4-2.6-2.2-4.6 1.6.3 2.2 1.6 2.2 2.8 0-1.2.6-2.5 2.2-2.8.2 2-.6 3.6-2.2 4.6z" />
            <path d="M12 13.6c-2.2-.4-3.6-1.8-3.8-3.8 1.9 0 3.2.9 3.8 2.3.6-1.4 1.9-2.3 3.8-2.3-.2 2-1.6 3.4-3.8 3.8z" />
            <path d="M12 18.2c-2.2-.4-3.6-1.8-3.8-3.8 1.9 0 3.2.9 3.8 2.3.6-1.4 1.9-2.3 3.8-2.3-.2 2-1.6 3.4-3.8 3.8z" />
          </g>
        </svg>
      );
    case 'military':
      return (
        <svg {...common}>
          <g stroke="currentColor" strokeWidth="1.8">
            <path d="M14.5 17.5L3.5 6.5V3.5h3l11 11" />
            <path d="M9.5 17.5l11-11V3.5h-3l-11 11" />
          </g>
          <g stroke="#a08250" strokeWidth="2">
            <path d="M12.8 19.2l6.4-6.4M15.5 17.5l3.5 3.5" />
            <path d="M11.2 19.2l-6.4-6.4M8.5 17.5L5 21" />
          </g>
        </svg>
      );
    case 'stability':
      return (
        <svg {...common}>
          <g fill="currentColor" stroke="#22301a" strokeWidth="0.9">
            <path d="M2.5 9.5L12 4l9.5 5.5z" />
            <rect x="3.5" y="9.5" width="17" height="1.6" />
            <rect x="5" y="11.6" width="2.2" height="7" />
            <rect x="9.3" y="11.6" width="2.2" height="7" />
            <rect x="12.5" y="11.6" width="2.2" height="7" />
            <rect x="16.8" y="11.6" width="2.2" height="7" />
            <rect x="3" y="19" width="18" height="2" />
          </g>
        </svg>
      );
    case 'legitimacy':
      return (
        <svg {...common}>
          <g fill="currentColor" stroke="#3a2a12" strokeWidth="0.9">
            <path d="M3 17.5L4.6 7l4.4 4.4L12 5l3 6.4L19.4 7 21 17.5z" />
            <rect x="3" y="18.2" width="18" height="2.3" rx="0.5" />
          </g>
          <circle cx="12" cy="13.5" r="1.1" fill="#8e3030" />
        </svg>
      );
  }
}
