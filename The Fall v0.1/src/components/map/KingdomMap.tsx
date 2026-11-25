import { tr } from '../../i18n/i18n';
import type { KeyboardEvent } from 'react';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import { COASTLINE, MAP_HEIGHT, MAP_WIDTH } from '../../data/provinces/mapLayout';
import { PROVINCE_TYPES } from '../../data/provinces/provinceTypes';
import { MAP_GEOMETRY, polylineToPath } from '../../features/map/mapGeometry';
import { getKingdomList } from '../../engine/selectors';
import { CompassRose, ProvinceGlyph } from './MapGlyphs';

interface KingdomMapProps {
  state: GameState;
  selectedId: ProvinceId | null;
  onSelect: (id: ProvinceId | null) => void;
  hoveredId: ProvinceId | null;
  /** Called with the province under the pointer (or focused), and the pointer position in client pixels. */
  onHover: (id: ProvinceId | null, clientX?: number, clientY?: number) => void;
  targetIds?: ProvinceId[] | null;
}

/** Smooth closed land outline: coastline (curved) plus the east/north map frame. */
function buildLandPath(): string {
  const pts = COASTLINE;
  const first = pts[0] as [number, number];
  let d = `M${MAP_WIDTH} 0 L${first[0]} ${first[1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i] as [number, number];
    const [nx, ny] = pts[i + 1] as [number, number];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = pts[pts.length - 1] as [number, number];
  d += ` L${last[0]} ${last[1]} L${MAP_WIDTH} ${MAP_HEIGHT} Z`;
  return d;
}

function buildCoastStroke(): string {
  const pts = COASTLINE;
  const first = pts[0] as [number, number];
  let d = `M${first[0]} ${first[1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i] as [number, number];
    const [nx, ny] = pts[i + 1] as [number, number];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = pts[pts.length - 1] as [number, number];
  return `${d} L${last[0]} ${last[1]}`;
}

const LAND_PATH = buildLandPath();
const COAST_PATH = buildCoastStroke();

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

  // Realm names are placed at the average centroid of each kingdom's provinces.
  const realmLabels = getKingdomList(state)
    .map((k) => {
      const owned = provinces.filter((p) => p.ownerId === k.id);
      if (owned.length === 0) return null;
      const cx = owned.reduce((s, p) => s + (shapes[p.id]?.centroid.x ?? 0), 0) / owned.length;
      const cy = owned.reduce((s, p) => s + (shapes[p.id]?.centroid.y ?? 0), 0) / owned.length;
      return { id: k.id, name: k.shortName, x: cx, y: cy };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

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
        <pattern id="terrain-fertile_lands" width="34" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <path d="M0 18 C9 16 20 20 34 17" className="terrain-line" />
          <path d="M7 18 v-5 M17 18 v-7 M27 18 v-5" className="terrain-line terrain-line--faint" />
          <path d="M2 5 h8 M20 7 h9" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-mountain_pass" width="46" height="34" patternUnits="userSpaceOnUse">
          <path d="M3 27 L14 10 L25 27 M21 27 L31 15 L43 27" className="terrain-line" />
          <path d="M11 15 L14 10 L18 16 M28 19 L31 15 L35 20" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-coastal_port" width="42" height="26" patternUnits="userSpaceOnUse">
          <path d="M1 8 q10 -7 20 0 t20 0 M-12 20 q10 -7 20 0 t20 0" className="terrain-line" />
        </pattern>
        <pattern id="terrain-mining_region" width="38" height="32" patternUnits="userSpaceOnUse">
          <path d="M5 23 L16 8 L27 23 Z" className="terrain-line terrain-line--faint" />
          <path d="M16 8 L20 14" className="terrain-line" />
          <circle cx="16" cy="18" r="1.4" className="terrain-dot" />
        </pattern>
        <pattern id="terrain-city" width="30" height="26" patternUnits="userSpaceOnUse">
          <path d="M3 21 V10 H10 V21 M13 21 V5 H21 V21 M24 21 V12 H28 V21" className="terrain-line terrain-line--faint" />
          <path d="M3 10 L6.5 7 L10 10 M13 5 L17 2 L21 5" className="terrain-line terrain-line--faint" />
        </pattern>
        <pattern id="terrain-castle" width="36" height="30" patternUnits="userSpaceOnUse">
          <path d="M4 24 V11 H8 V15 H13 V11 H17 V15 H22 V11 H27 V24 Z" className="terrain-line terrain-line--faint" />
          <path d="M8 11 V7 H13 V11 M17 11 V6 H22 V11" className="terrain-line terrain-line--faint" />
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#5a4430" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a4430" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      {/* Sea */}
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="sea" onClick={() => onSelect(null)} />
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sea-waves)" pointerEvents="none" />
      <text className="sea__label" transform="translate(52 300) rotate(-90)">{tr('The Grey Sea')}</text>
      <CompassRose x={66} y={572} size={34} />

      {/* Land and provinces */}
      <g clipPath="url(#land-clip)">
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="land" />
        {provinces.map((p) => {
          const shape = shapes[p.id];
          const owner = state.kingdoms[p.ownerId];
          if (!shape || !owner) return null;
          const isSelected = p.id === selectedId;
          const classes = [
            'prov',
            isSelected && 'prov--selected',
            neighborIds.has(p.id) && 'prov--neighbor',
            owner.isPlayer && 'prov--player',
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

        {/* Terrain texture overlay gives each province type its own look */}
        {provinces.map((p) => (
          <path key={`terrain-${p.id}`} d={shapes[p.id]?.path} fill={`url(#terrain-${p.type})`} className="terrain" pointerEvents="none" />
        ))}

        {/* Ancestral claims: lands that were Ardenhal's but are held by others */}
        {provinces
          .filter((p) => p.historicalOwnerId === state.playerKingdomId && p.ownerId !== state.playerKingdomId)
          .map((p) => (
            <path key={`claim-${p.id}`} d={shapes[p.id]?.path} fill="url(#claim-hatch)" pointerEvents="none" />
          ))}

        <rect width={MAP_WIDTH} height={MAP_HEIGHT} filter="url(#paper-grain)" pointerEvents="none" />

        {/* Borders: thin between provinces of one realm, heavy between realms */}
        {borders.map((b) => {
          const a = state.provinces[b.a];
          const c = state.provinces[b.b];
          const realmBorder = a && c && a.ownerId !== c.ownerId;
          return (
            <path
              key={`${b.a}|${b.b}`}
              d={polylineToPath(b.points)}
              className={realmBorder ? 'border border--realm' : 'border border--province'}
              pointerEvents="none"
            />
          );
        })}

        {/* Hover outline */}
        {hoveredId && hoveredId !== selectedId && shapes[hoveredId] && (
          <path d={shapes[hoveredId]?.path} className="prov-hover" pointerEvents="none" />
        )}

        {/* Selection outline on top */}
        {selected && shapes[selected.id] && (
          <path d={shapes[selected.id]?.path} className="prov-outline" pointerEvents="none" />
        )}
      </g>

      {/* Coastline: heavy ink line with an offset shore line */}
      <path d={COAST_PATH} className="coast coast--shore" pointerEvents="none" />
      <path d={COAST_PATH} className="coast" pointerEvents="none" />

      {/* Realm names */}
      {realmLabels.map((l) => (
        <text key={`realm-${l.id}`} x={l.x} y={l.y - 52} className="realm-label" pointerEvents="none">
          {tr(l.name)}
        </text>
      ))}

      {/* Province labels and glyphs */}
      {provinces.map((p) => {
        const shape = shapes[p.id];
        if (!shape) return null;
        const { x, y } = shape.centroid;
        return (
          <g
            key={`label-${p.id}`}
            className={`prov-label ${p.id === selectedId ? 'prov-label--selected' : ''}`}
            pointerEvents="none"
          >
            <ProvinceGlyph type={p.type} x={x} y={y - 16} />
            <text x={x} y={y + 14} className="prov-label__name">
              {p.isCapital ? '♛ ' : ''}
              {tr(p.name)}
            </text>
            {state.sieges.some((s) => s.provinceId === p.id) && (
              <g className="siege-marker" transform={`translate(${x + 30} ${y - 22})`}>
                <title>{tr('Under siege')}</title>
                <circle r="10" />
                <path d="M-5 -5 L5 5 M5 -5 L-5 5" />
              </g>
            )}
          </g>
        );
      })}

      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#vignette)" pointerEvents="none" />
      <rect x="4" y="4" width={MAP_WIDTH - 8} height={MAP_HEIGHT - 8} className="map-frame" pointerEvents="none" />
      <rect x="10" y="10" width={MAP_WIDTH - 20} height={MAP_HEIGHT - 20} className="map-frame map-frame--inner" pointerEvents="none" />
    </svg>
  );
}
