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

function buildCoastStroke(): string {
  return buildLandPath();
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

        {/* Subtle elevation contours unify the provinces into one hand-drawn atlas. */}
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#atlas-contours)" className="atlas-contours" pointerEvents="none" />

        {/* The King's River descends from the eastern highlands and fans into four delta channels. */}
        <g className="river-system" clipPath="url(#land-clip)" pointerEvents="none">
          <path d="M 820 72 C 785 124 784 174 755 220 C 728 264 725 305 692 338 C 664 365 633 365 603 389 C 579 408 559 428 532 452" className="river__bank river__bank--main" />
          <path d="M 820 72 C 785 124 784 174 755 220 C 728 264 725 305 692 338 C 664 365 633 365 603 389 C 579 408 559 428 532 452" className="river__water river__water--main" />
          <path d="M 820 72 C 785 124 784 174 755 220 C 728 264 725 305 692 338 C 664 365 633 365 603 389 C 579 408 559 428 532 452" className="river__shine river__shine--main" />

          <path d="M 570 108 C 584 158 601 204 609 248 C 615 293 608 339 586 389" className="river__bank river__bank--tributary" />
          <path d="M 570 108 C 584 158 601 204 609 248 C 615 293 608 339 586 389" className="river__water river__water--tributary" />
          <path d="M 570 108 C 584 158 601 204 609 248 C 615 293 608 339 586 389" className="river__shine river__shine--tributary" />

          <path d="M 306 284 C 333 318 370 343 409 358 C 445 372 471 384 503 399 C 517 412 525 431 532 452" className="river__bank river__bank--tributary" />
          <path d="M 306 284 C 333 318 370 343 409 358 C 445 372 471 384 503 399 C 517 412 525 431 532 452" className="river__water river__water--tributary" />
          <path d="M 306 284 C 333 318 370 343 409 358 C 445 372 471 384 503 399 C 517 412 525 431 532 452" className="river__shine river__shine--tributary" />

          <path d="M 532 452 C 495 431 469 418 433 425 C 395 434 371 462 338 483 C 302 505 266 521 237 543 C 224 553 217 559 211 550" className="river__bank river__bank--channel" />
          <path d="M 532 452 C 495 431 469 418 433 425 C 395 434 371 462 338 483 C 302 505 266 521 237 543 C 224 553 217 559 211 550" className="river__water river__water--channel" />
          <path d="M 532 452 C 495 431 469 418 433 425 C 395 434 371 462 338 483 C 302 505 266 521 237 543 C 224 553 217 559 211 550" className="river__shine river__shine--channel" />

          <path d="M 520 458 C 494 477 471 506 457 536 C 443 565 424 597 407 626" className="river__bank river__bank--channel" />
          <path d="M 520 458 C 494 477 471 506 457 536 C 443 565 424 597 407 626" className="river__water river__water--channel" />
          <path d="M 520 458 C 494 477 471 506 457 536 C 443 565 424 597 407 626" className="river__shine river__shine--channel" />

          <path d="M 535 458 C 559 482 578 510 585 541 C 592 571 596 604 602 630" className="river__bank river__bank--channel" />
          <path d="M 535 458 C 559 482 578 510 585 541 C 592 571 596 604 602 630" className="river__water river__water--channel" />
          <path d="M 535 458 C 559 482 578 510 585 541 C 592 571 596 604 602 630" className="river__shine river__shine--channel" />

          <path d="M 552 450 C 614 434 666 447 711 473 C 757 500 793 550 825 594" className="river__bank river__bank--channel" />
          <path d="M 552 450 C 614 434 666 447 711 473 C 757 500 793 550 825 594" className="river__water river__water--channel" />
          <path d="M 552 450 C 614 434 666 447 711 473 C 757 500 793 550 825 594" className="river__shine river__shine--channel" />

          {/* Low marsh islands between the distributaries. */}
          <path d="M 344 492 C 361 480 382 486 390 501 C 379 517 359 524 343 513 Z" className="delta-marsh" />
          <path d="M 452 548 C 468 535 490 541 496 557 C 483 571 464 576 448 563 Z" className="delta-marsh" />
          <path d="M 626 511 C 644 498 664 505 670 521 C 657 537 639 541 624 527 Z" className="delta-marsh" />
          <path d="M 735 505 C 752 492 772 500 778 516 C 764 531 746 537 731 522 Z" className="delta-marsh" />
          <ellipse cx="211" cy="550" rx="18" ry="10" className="river-mouth" />
          <ellipse cx="407" cy="626" rx="19" ry="10" className="river-mouth" />
          <ellipse cx="602" cy="630" rx="22" ry="11" className="river-mouth" />
          <ellipse cx="825" cy="594" rx="20" ry="10" className="river-mouth" />
        </g>

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
            <g key={`${b.a}|${b.b}`} pointerEvents="none">
              {realmBorder && (
                <path d={polylineToPath(b.points)} className="border border--realm-halo" />
              )}
              <path
                d={polylineToPath(b.points)}
                className={realmBorder ? 'border border--realm' : 'border border--province'}
              />
            </g>
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
