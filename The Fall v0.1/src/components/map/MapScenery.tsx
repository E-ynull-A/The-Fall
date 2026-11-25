/**
 * Hand-illustrated SVG scenery for the River Delta map.
 * These are reusable vector assets, not a flattened background image:
 * province selection, hover, ownership fills and borders remain interactive.
 */
type SceneryPoint = { x: number; y: number; scale?: number; rotate?: number };

const FOREST_TREES: SceneryPoint[] = [
  { x: 178, y: 104, scale: 0.86 }, { x: 209, y: 91, scale: 0.78 },
  { x: 238, y: 111, scale: 0.94 }, { x: 270, y: 94, scale: 0.76 },
  { x: 297, y: 126, scale: 0.84 }, { x: 333, y: 149, scale: 0.72 },
  { x: 142, y: 414, scale: 0.88 }, { x: 170, y: 437, scale: 0.78 },
  { x: 199, y: 414, scale: 0.98 }, { x: 226, y: 449, scale: 0.82 },
  { x: 281, y: 471, scale: 0.76 }, { x: 315, y: 445, scale: 0.88 },
  { x: 365, y: 180, scale: 0.78 }, { x: 395, y: 163, scale: 0.92 },
  { x: 426, y: 181, scale: 0.78 }, { x: 454, y: 160, scale: 0.84 },
  { x: 705, y: 198, scale: 0.82 }, { x: 735, y: 178, scale: 0.94 },
  { x: 765, y: 202, scale: 0.76 }, { x: 798, y: 186, scale: 0.84 },
  { x: 870, y: 444, scale: 0.86 }, { x: 900, y: 424, scale: 0.76 },
  { x: 928, y: 454, scale: 0.92 }, { x: 850, y: 493, scale: 0.72 },
  { x: 650, y: 518, scale: 0.78 }, { x: 681, y: 493, scale: 0.88 },
  { x: 710, y: 526, scale: 0.82 },
];

const HILLS: SceneryPoint[] = [
  { x: 365, y: 245, scale: 0.9, rotate: -4 },
  { x: 420, y: 270, scale: 0.72, rotate: 3 },
  { x: 255, y: 345, scale: 0.72, rotate: -7 },
  { x: 450, y: 475, scale: 0.82, rotate: 5 },
  { x: 625, y: 476, scale: 0.72, rotate: -3 },
  { x: 785, y: 380, scale: 0.82, rotate: 4 },
];

const PEAKS: SceneryPoint[] = [
  { x: 700, y: 30, scale: 0.82 }, { x: 755, y: 20, scale: 1.06 },
  { x: 814, y: 34, scale: 0.9 }, { x: 868, y: 19, scale: 1.12 },
  { x: 921, y: 56, scale: 0.82 }, { x: 946, y: 109, scale: 0.68 },
  { x: 895, y: 165, scale: 0.72 }, { x: 842, y: 181, scale: 0.64 },
];

const REEDS: SceneryPoint[] = [
  { x: 255, y: 520, scale: 0.9 }, { x: 278, y: 539, scale: 0.78 },
  { x: 373, y: 556, scale: 0.9 }, { x: 427, y: 570, scale: 0.74 },
  { x: 620, y: 566, scale: 0.82 }, { x: 650, y: 584, scale: 0.72 },
  { x: 747, y: 530, scale: 0.82 }, { x: 790, y: 555, scale: 0.74 },
];

function place(points: SceneryPoint[], symbol: string, width: number, height: number) {
  return points.map((point, index) => {
    const scale = point.scale ?? 1;
    return (
      <use
        key={`${symbol}-${index}`}
        href={`#${symbol}`}
        x={point.x - (width * scale) / 2}
        y={point.y - (height * scale) / 2}
        width={width * scale}
        height={height * scale}
        transform={point.rotate ? `rotate(${point.rotate} ${point.x} ${point.y})` : undefined}
      />
    );
  });
}

export function MapScenery() {
  return (
    <g className="map-scenery" pointerEvents="none" aria-hidden="true">
      <defs>
        <symbol id="scenery-pine" viewBox="0 0 40 58">
          <path d="M19 54 L20 14 L23 54 Z" fill="#5b452c" />
          <path d="M20 2 L4 25 L13 23 L1 39 L16 35 L6 49 L34 49 L24 35 L39 39 L27 23 L36 25 Z" fill="#244535" stroke="#172f27" strokeWidth="1.4" />
          <path d="M20 3 L12 25 L19 21 L9 38 L19 33 L13 47 L20 47 Z" fill="#456c4d" opacity="0.88" />
          <path d="M20 5 L20 48" stroke="#8da36b" strokeWidth="1.2" opacity="0.7" />
          <path d="M5 39 L14 37 M26 25 L35 27 M12 48 L28 48" stroke="#a1b47a" strokeWidth="1" opacity="0.58" />
        </symbol>
        <symbol id="scenery-oak" viewBox="0 0 48 52">
          <path d="M22 48 L24 20 L29 48 Z" fill="#61462c" />
          <path d="M24 4 C12 0 4 11 9 20 C-1 28 8 39 18 34 C23 44 37 39 36 31 C49 28 44 14 36 13 C34 5 28 2 24 4 Z" fill="#36583c" stroke="#1f3b2c" strokeWidth="1.4" />
          <path d="M22 8 C12 8 8 17 14 22 C7 29 15 34 22 31 C27 37 37 31 34 24 C41 15 30 8 22 8 Z" fill="#6b8650" opacity="0.82" />
          <circle cx="15" cy="18" r="2" fill="#a1b47a" opacity="0.72" />
          <circle cx="31" cy="25" r="2" fill="#a1b47a" opacity="0.62" />
        </symbol>
        <symbol id="scenery-peak" viewBox="0 0 92 78">
          <path d="M3 72 L31 22 L47 43 L65 8 L90 72 Z" fill="#55564d" stroke="#353d37" strokeWidth="2" />
          <path d="M31 22 L40 35 L33 34 L30 43 L23 37 Z M65 8 L78 30 L69 26 L63 39 L57 28 Z" fill="#e6dfc7" stroke="#b5b09d" strokeWidth="1.2" />
          <path d="M3 72 L31 22 L18 72 Z M47 43 L65 8 L56 72 Z" fill="#747766" opacity="0.72" />
          <path d="M9 65 L23 55 M52 65 L72 43 M74 66 L83 56" stroke="#a7a38e" strokeWidth="1.4" opacity="0.7" />
          <path d="M4 72 H90" stroke="#3b3b31" strokeWidth="2" />
        </symbol>
        <symbol id="scenery-hill" viewBox="0 0 82 42">
          <path d="M2 38 Q19 4 40 25 Q57 -1 80 38 Z" fill="#89905d" stroke="#626d49" strokeWidth="1.3" />
          <path d="M11 36 Q25 14 40 29 Q56 9 72 36" fill="none" stroke="#b7ac72" strokeWidth="1.5" opacity="0.8" />
          <path d="M18 33 Q31 23 40 32 Q54 21 65 34" fill="none" stroke="#586d48" strokeWidth="1" opacity="0.8" />
        </symbol>
        <symbol id="scenery-reeds" viewBox="0 0 42 52">
          <path d="M20 50 Q18 29 8 10 M21 50 Q23 24 29 5 M22 50 Q31 33 38 20 M18 50 Q12 34 4 26" fill="none" stroke="#647d5b" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 10 q-4 -5 2 -7 q6 2 2 7 M27 5 q-3 -5 3 -5 q5 3 0 7 M37 20 q-4 -4 1 -7 q5 3 1 7" fill="#8c7650" stroke="#6e5d3e" strokeWidth="0.8" />
          <path d="M4 50 H38" stroke="#7f8661" strokeWidth="1.2" />
        </symbol>
        <symbol id="scenery-keep" viewBox="0 0 94 76">
          <path d="M7 70 V28 H20 V18 H34 V28 H60 V17 H74 V28 H87 V70 Z" fill="#9c8863" stroke="#4b3c2a" strokeWidth="2" />
          <path d="M2 29 V6 H26 V29 M28 29 V1 H48 V29 M57 29 V7 H81 V29" fill="#a7946d" stroke="#4b3c2a" strokeWidth="2" />
          <path d="M2 6 H8 V12 H14 V6 H20 V12 H26 M28 1 H34 V7 H40 V1 H48 M57 7 H63 V13 H69 V7 H81" fill="none" stroke="#4b3c2a" strokeWidth="2" />
          <path d="M35 70 V48 Q47 33 59 48 V70 Z" fill="#403426" stroke="#332719" strokeWidth="1.5" />
          <path d="M13 41 H22 V51 H13 Z M70 41 H79 V51 H70 Z" fill="#5a4931" />
          <path d="M47 2 V-8 M47 -8 L64 -3 L47 2" fill="#8e302b" stroke="#54221e" strokeWidth="1" />
          <path d="M7 70 H87" stroke="#e0c68d" strokeWidth="1.5" />
        </symbol>
      </defs>

      <g className="scenery__hills">{place(HILLS, 'scenery-hill', 82, 42)}</g>
      <g className="scenery__mountains">{place(PEAKS, 'scenery-peak', 92, 78)}</g>
      <g className="scenery__forests">
        {place(FOREST_TREES.filter((_, index) => index % 2 === 0), 'scenery-pine', 40, 58)}
        {place(FOREST_TREES.filter((_, index) => index % 2 === 1), 'scenery-oak', 48, 52)}
      </g>
      <g className="scenery__marsh">{place(REEDS, 'scenery-reeds', 42, 52)}</g>
      <g className="scenery__forts">
        <use href="#scenery-keep" x="648" y="276" width="45" height="37" />
        <use href="#scenery-keep" x="907" y="376" width="38" height="31" />
      </g>
    </g>
  );
}
