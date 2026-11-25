import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import { RESOURCE_KEYS } from '../../engine/ResourceManager';
import { getPlayerKingdom } from '../../engine/selectors';
import { ResourceStat } from '../resources/ResourceStat';

const FLEUR_PATH =
  'M12 1.5c-1.3 2.1-2 3.8-2 5.5 0 1.7.8 3.1 2 4 1.2-.9 2-2.3 2-4 0-1.7-.7-3.4-2-5.5zM10.6 11.4C9.6 9.1 7.5 8 5.4 8.4 3.5 8.8 2.6 10.7 3.5 12.2c.6 1.1 2 1.3 2.8.5-.6-.2-1-.8-.8-1.5.3-.8 1.6-1.1 2.7-.6 1 .5 1.8 1.5 2.2 2.4zM13.4 11.4c1-2.3 3.1-3.4 5.2-3 1.9.4 2.8 2.3 1.9 3.8-.6 1.1-2 1.3-2.8.5.6-.2 1-.8.8-1.5-.3-.8-1.6-1.1-2.7-.6-1 .5-1.8 1.5-2.2 2.4zM7.8 13.2h8.4v1.7H7.8zM10.9 14.9h2.2l.6 4.3c.2 1.4 1 2.3 2.1 2.8H8.2c1.1-.5 1.9-1.4 2.1-2.8z';

function Fleur({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path d={FLEUR_PATH} fill="currentColor" />
    </svg>
  );
}

/** Compact royal standard: a crowned golden lion on an aged-burgundy field. */
function HeraldicBanner() {
  return (
    <svg className="hdr-banner" viewBox="0 0 52 72" aria-hidden>
      <defs>
        <linearGradient id="hdr-rod" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4dfa5" />
          <stop offset="0.48" stopColor="#c49a4c" />
          <stop offset="1" stopColor="#76501f" />
        </linearGradient>
        <linearGradient id="hdr-field" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8d3430" />
          <stop offset="0.52" stopColor="#682323" />
          <stop offset="1" stopColor="#3d1517" />
        </linearGradient>
        <linearGradient id="hdr-lion" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#f4dda0" />
          <stop offset="0.55" stopColor="#d4ad61" />
          <stop offset="1" stopColor="#9c6b2c" />
        </linearGradient>
        <filter id="hdr-banner-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      {/* soft cast shadow */}
      <path d="M8 10h36v44L26 69 8 54z" fill="#000" opacity=".42" filter="url(#hdr-banner-shadow)" />
      {/* banner pole and finials */}
      <rect x="5" y="4" width="42" height="4" rx="2" fill="url(#hdr-rod)" stroke="#4d3518" strokeWidth=".7" />
      <path d="M4 6l-2-2v4zM48 6l2-2v4z" fill="url(#hdr-rod)" stroke="#76501f" strokeWidth=".5" />
      <circle cx="5" cy="6" r="2.1" fill="url(#hdr-rod)" stroke="#5a3b18" strokeWidth=".6" />
      <circle cx="47" cy="6" r="2.1" fill="url(#hdr-rod)" stroke="#5a3b18" strokeWidth=".6" />
      {/* cloth and double engraved border */}
      <path d="M9 9h34v43L26 68 9 52z" fill="url(#hdr-field)" stroke="#d8b76e" strokeWidth="1.5" />
      <path d="M11.5 11.5h29v39.4L26 64.8 11.5 50.8z" fill="none" stroke="#e1c47e" strokeWidth=".55" opacity=".85" />
      <path d="M14 14h24v35.5L26 60.8 14 49.5z" fill="none" stroke="#b88943" strokeWidth=".45" opacity=".55" />
      {/* crown */}
      <g fill="url(#hdr-lion)" stroke="#67451d" strokeWidth=".55" strokeLinejoin="round">
        <path d="M18 20l-1.2-5.4 4.1 2.7 2.7-4.2 2.7 4.2 4.1-2.7-1.2 5.4z" />
        <path d="M18.3 20.5h11.4l-.8 2.3H19.1z" />
        <circle cx="17" cy="14.4" r="1" /><circle cx="26" cy="11.7" r="1" /><circle cx="35" cy="14.4" r="1" />
      </g>
      {/* heraldic rampant lion */}
      <g fill="none" stroke="url(#hdr-lion)" strokeLinecap="round" strokeLinejoin="round">
        {/* raised tail */}
        <path d="M29 43c7-2 9-8 6-12-1.5-2-.5-4.2 1.8-4.8" strokeWidth="2.1" />
        <path d="M36.5 26.5l2.2-1.4-1.1 2.8" strokeWidth="1.5" />
        {/* hind legs */}
        <path d="M23 43l-5 6-5 1.2M24 45l1.5 6 4.5 2" strokeWidth="2.8" />
        {/* body */}
        <path d="M20 30c3-3 8-2 10 2 2 4 1 9-2 12-3 3-8 2-10-1-2-4-1-10 2-13z" fill="url(#hdr-lion)" strokeWidth=".8" />
        {/* raised forelegs */}
        <path d="M20 32l-5-5-4-1M22 30l-1-6-4-3" strokeWidth="2.7" />
        <path d="M11 26l-2-2M17 21l-2-2" strokeWidth="1.2" />
        {/* head and mane */}
        <path d="M19 27c-3-2-3-6-1-8l3-2 4 2 1 4-3 4z" fill="url(#hdr-lion)" strokeWidth=".8" />
        <path d="M18 19l-2-2 3 .2 1.5-2 1.2 2 2.7-.3-1.3 2.5" strokeWidth="1.1" />
        <path d="M22.5 22l2 1-.5 1.5-2 .3" stroke="#70471e" strokeWidth=".75" />
      </g>
      {/* small lower fleur detail */}
      <path d="M26 55c-1.5-2.3-1.8-3.8 0-5.2 1.8 1.4 1.5 2.9 0 5.2zm-1 0c-2-1.5-3.5-1.5-4.2-.2 1.2 1.5 2.6 1.5 4.2.2zm2 0c2-1.5 3.5-1.5 4.2-.2-1.2 1.5-2.6 1.5-4.2.2z" fill="#d9b66a" opacity=".8" />
    </svg>
  );
}

/** Gold filigree for a header corner; mirrored with CSS for the bottom one. */
function CornerFiligree({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M3 38V3h35" />
        <path d="M6 30V6h24" opacity="0.6" />
        <path d="M6 18c4 0 6-3 6-6s-2-5-4.5-4.2C5.6 8.4 6 11 8 11" />
        <path d="M18 6c0 4-3 6-6 6" />
        <path d="M22 6c1.5 2.5 4 3 6 1.5" />
        <path d="M6 22c2.5 1.5 3 4 1.5 6" />
      </g>
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

/**
 * The royal header: identity (left), the five resources (centre) and the year (right).
 * Three flexible grid zones in normal flow, spanning the full layout width.
 */
export function TopBar({ state }: { state: GameState }) {
  const player = getPlayerKingdom(state);
  const yearOfReign = state.year - state.startYear + 1;
  // Show last year's change only for the year it describes.
  const report = state.lastYearReport?.year === state.year ? state.lastYearReport : null;
  const reign = tr(state.scenario ? `Scenario · ends after ${state.scenario.lastYear}` : `Year ${yearOfReign} of your reign`);

  return (
    <header className="topbar hdr">
      <CornerFiligree className="hdr-corner hdr-corner--top" />
      <CornerFiligree className="hdr-corner hdr-corner--bottom" />
      <div className="hdr__identity">
        <HeraldicBanner />
        <span className="hdr__divider" aria-hidden>
          <Fleur className="hdr__divider-fleur" />
        </span>
        <div className="hdr__titles">
          <span className="topbar__title">{tr('The Fall')}</span>
          <span className="hdr__realm">
            <span className="hdr__flourish" aria-hidden />
            <span className="hdr__realm-name">{tr(player.name)}</span>
            <span className="hdr__flourish hdr__flourish--r" aria-hidden />
          </span>
          <span className="hdr__rule" aria-hidden>
            <span className="hdr__rule-line" />
            <Fleur className="hdr__rule-fleur" />
            <span className="hdr__rule-line" />
          </span>
        </div>
      </div>

      <div className="hdr__resources">
        <div className="topbar__resources">
          {RESOURCE_KEYS.map((key) => (
            <ResourceStat key={key} resource={key} value={player.resources[key]} change={report?.resourceChange[key]} />
          ))}
        </div>
      </div>

      <div className="hdr__chronicle">
        <span className="topbar__year-label">{tr('Anno Domini')}</span>
        <span className="topbar__year-value">{state.year}</span>
        <span className="hdr__ribbon" title={reign}>
          {reign}
        </span>
      </div>
    </header>
  );
}
