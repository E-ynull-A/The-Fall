import { tr } from '../../i18n/i18n';
import type { KeyboardEvent } from 'react';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import { COASTLINE, MAP_HEIGHT, MAP_WIDTH, PROVINCE_LABEL_LAYOUT } from '../../data/provinces/mapLayout';
import { PROVINCE_TYPES } from '../../data/provinces/provinceTypes';
import { PROVINCES } from '../../data/provinces/provinces';
import { MAP_GEOMETRY, polylineToPath } from '../../features/map/mapGeometry';

interface KingdomMapProps {
  state: GameState;
  selectedId: ProvinceId | null;
  onSelect: (id: ProvinceId | null) => void;
  hoveredId: ProvinceId | null;
  /** Called with the province under the pointer (or focused), and the pointer position in client pixels. */
  onHover: (id: ProvinceId | null, clientX?: number, clientY?: number) => void;
  targetIds?: ProvinceId[] | null;
}

/** Smooth, fully enclosed island silhouette. The coastline now wraps all four sides. */
function buildLandPath(): string {
  const pts = COASTLINE;
  if (pts.length < 4) return '';
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  const startX = (last[0] + first[0]) / 2;
  const startY = (last[1] + first[1]) / 2;
  let d = `M${startX} ${startY}`;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    const [nx, ny] = pts[(i + 1) % pts.length]!;
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  return `${d} Z`;
}

const LAND_PATH = buildLandPath();
const INITIAL_OWNER_BY_PROVINCE = Object.fromEntries(PROVINCES.map((p) => [p.id, p.ownerId])) as Record<ProvinceId, string>;

/**
 * Interactive atlas. Every province is its own SVG shape bound to a Province entity.
 * Rendering only: ownership, claims and neighbors are read from GameState.
 */
export function KingdomMap({ state, selectedId, onSelect, hoveredId, onHover, targetIds = null }: KingdomMapProps) {
  const targets = targetIds ? new Set(targetIds) : null;
  const { shapes, borders } = MAP_GEOMETRY;
  const provinces = Object.values(state.provinces);
  const selected = selectedId ? state.provinces[selectedId] : undefined;
  const neighborIds = new Set(targetIds ? [] : (selected?.neighbors ?? []));

  const handleKey = (e: KeyboardEvent, id: ProvinceId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id === selectedId ? null : id);
    }
  };

  return (
    <svg
      className="atlas-map"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={tr('Map of the known realms')}
    >
      <defs>
        <linearGradient id="sea-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c1c2aa" />
          <stop offset="0.48" stopColor="#aeb59f" />
          <stop offset="1" stopColor="#929f91" />
        </linearGradient>
        <linearGradient id="parchment-gradient" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f0e5c8" />
          <stop offset="0.52" stopColor="#e5d4ad" />
          <stop offset="1" stopColor="#d8c49a" />
        </linearGradient>
        <pattern id="atlas-contours" width="118" height="92" patternUnits="userSpaceOnUse">
          <path d="M-16 25 C8 7 28 7 48 23 S88 42 132 16" className="contour-line" />
          <path d="M-18 34 C8 16 30 17 49 32 S88 52 132 26" className="contour-line contour-line--inner" />
          <path d="M-14 70 C10 52 35 51 58 66 S98 83 130 61" className="contour-line contour-line--inner" />
        </pattern>
        <clipPath id="land-clip">
          <path d={LAND_PATH} />
        </clipPath>
        <pattern id="sea-waves" width="44" height="22" patternUnits="userSpaceOnUse">
          <path d="M4 14 q5 -5 10 0 t10 0" className="sea__wave" />
          <path d="M26 4 q4 -4 8 0" className="sea__wave sea__wave--faint" />
        </pattern>
        <pattern id="claim-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" className="claim-hatch__line" />
        </pattern>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.09 0"
          />
        </filter>
        {/* Terrain textures, one per province type (subtle) */}
        <pattern id="terrain-fertile_lands" width="54" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
          <path d="M-4 12 C12 7 28 8 58 12 M-4 22 C14 17 34 18 58 22 M-4 32 C14 27 34 28 58 32" className="terrain-line" />
          <path d="M9 12 v-5 M24 22 v-6 M42 32 v-5" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-mountain_pass" width="72" height="58" patternUnits="userSpaceOnUse">
          <path d="M4 47 L22 17 L40 47 M30 47 L48 25 L67 47" className="terrain-line" />
          <path d="M16 27 L22 17 L29 29 M42 33 L48 25 L54 34" className="terrain-line terrain-line--faint" />
          <path d="M0 51 H72" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-coastal_port" width="58" height="42" patternUnits="userSpaceOnUse">
          <path d="M-4 12 q14 -9 28 0 t28 0 M-4 29 q14 -9 28 0 t28 0" className="terrain-line" />
          <path d="M13 20 h13 M39 37 h12" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-mining_region" width="62" height="52" patternUnits="userSpaceOnUse">
          <path d="M8 37 L23 13 L38 37 Z M23 13 L29 23 L35 19" className="terrain-line" />
          <path d="M16 37 L23 25 L30 37" className="terrain-line terrain-line--faint" />
          <circle cx="23" cy="31" r="1.5" className="terrain-dot" />
        </pattern>
        <pattern id="terrain-city" width="58" height="48" patternUnits="userSpaceOnUse">
          <path d="M8 38 V21 H19 V38 M23 38 V12 H38 V38 M42 38 V25 H51 V38" className="terrain-line" />
          <path d="M8 21 L13.5 16 L19 21 M23 12 L30.5 6 L38 12" className="terrain-line terrain-line--faint" />
          <path d="M13 27 V32 M29 19 V25 M34 19 V25 M45 30 V34" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-castle" width="66" height="54" patternUnits="userSpaceOnUse">
          <path d="M12 42 V21 H19 V27 H26 V21 H33 V27 H40 V21 H47 V42 Z" className="terrain-line" />
          <path d="M19 21 V14 H26 V21 M33 21 V12 H40 V21" className="terrain-line terrain-line--faint" />
          <path d="M26 42 V32 C26 26 33 26 33 32 V42" className="terrain-line terrain-line--faint" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#5a4430" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a4430" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      {/* Supplied D-map artwork. Vector layers above it keep each province interactive. */}
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="sea" onClick={() => onSelect(null)} />
      <image
        className="map-artwork"
        href="/assets/river-delta-d.webp"
        x="0"
        y="0"
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        preserveAspectRatio="none"
        pointerEvents="none"
      />

      {/* Land and provinces */}
      <g clipPath="url(#land-clip)">
        {provinces.map((p) => {
          const shape = shapes[p.id];
          const owner = state.kingdoms[p.ownerId];
          if (!shape || !owner) return null;
          const isSelected = p.id === selectedId;
          const ownerChanged = owner.id !== INITIAL_OWNER_BY_PROVINCE[p.id];
          const classes = [
            'prov',
            isSelected && 'prov--selected',
            neighborIds.has(p.id) && 'prov--neighbor',
            owner.isPlayer && 'prov--player',
            ownerChanged && 'prov--owner-changed',
            targets && (targets.has(p.id) ? 'prov--target' : 'prov--dim'),
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <path
              key={p.id}
              d={shape.path}
              className={classes}
              style={{ ['--realm' as string]: owner.color }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${tr(p.name)}, ${tr(PROVINCE_TYPES[p.type].label)}, held by ${tr(owner.name)}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : p.id);
              }}
              onKeyDown={(e) => handleKey(e, p.id)}
              onMouseMove={(e) => onHover(p.id, e.clientX, e.clientY)}
              onMouseLeave={() => onHover(null)}
              onFocus={(e) => {
                const r = (e.target as SVGPathElement).getBoundingClientRect();
                onHover(p.id, r.left + r.width / 2, r.top + r.height / 2);
              }}
              onBlur={() => onHover(null)}
            />
          );
        })}

        {/* Ancestral claims: lands that were Ardenhal's but are held by others */}
        {provinces
          .filter((p) => p.historicalOwnerId === state.playerKingdomId && p.ownerId !== state.playerKingdomId)
          .map((p) => (
            <path key={`claim-${p.id}`} d={shapes[p.id]?.path} fill="url(#claim-hatch)" pointerEvents="none" />
          ))}

        {/* Hover outline */}
        {hoveredId && hoveredId !== selectedId && shapes[hoveredId] && (
          <path d={shapes[hoveredId]?.path} className="prov-hover" pointerEvents="none" />
        )}

        {/* Selection outline on top */}
        {selected && shapes[selected.id] && (
          <path d={shapes[selected.id]?.path} className="prov-outline" pointerEvents="none" />
        )}
      </g>

      {/* Localized labels are redrawn on top of the artwork's retouched name plaques. */}
      {provinces.map((p) => {
        const label = PROVINCE_LABEL_LAYOUT[p.id];
        if (!label) return null;
        const { x, y, width } = label;
        const name = tr(p.name);
        return (
          <g
            key={`label-${p.id}`}
            className={`prov-label ${p.id === selectedId ? 'prov-label--selected' : ''}`}
            pointerEvents="none"
          >
            <rect
              className="prov-label__plaque"
              x={x - width / 2}
              y={y - 13}
              width={width}
              height="26"
              rx="7"
            />
            <text x={x} y={y + 5} className="prov-label__name">{name}</text>
            {state.sieges.some((s) => s.provinceId === p.id) && (
              <g className="siege-marker" transform={`translate(${x + width / 2 + 9} ${y - 14})`}>
                <title>{tr('Under siege')}</title>
                <circle r="10" />
                <path d="M-5 -5 L5 5 M5 -5 L-5 5" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
