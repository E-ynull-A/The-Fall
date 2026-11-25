import type { ProvinceType } from '../../types/province';

/** Small engraved-style glyphs drawn on the atlas for each province type. */
export function ProvinceGlyph({ type, x, y }: { type: ProvinceType; x: number; y: number }) {
  return (
    <g className="glyph" transform={`translate(${x} ${y})`} aria-hidden>
      {renderGlyph(type)}
    </g>
  );
}

function renderGlyph(type: ProvinceType) {
  switch (type) {
    case 'fertile_lands':
      return (
        <>
          <path d="M-14 6 q2 -9 4 0 M-12 6 v-10 M-4 6 q2 -9 4 0 M-2 6 v-10 M6 6 q2 -9 4 0 M8 6 v-10" />
          <path d="M-18 7 h36" />
        </>
      );
    case 'mountain_pass':
      return (
        <>
          <path d="M-20 8 L-9 -10 L2 8" />
          <path d="M-13 -3 l4 -7 l3 5" className="glyph__shade" />
          <path d="M-2 8 L9 -6 L20 8" />
          <path d="M-6 8 c4 -4 8 -2 12 -6" className="glyph__road" />
        </>
      );
    case 'mining_region':
      return (
        <>
          <path d="M-16 8 L-4 -10 L8 8 Z" />
          <path d="M-7 8 v-6 h6 v6" />
          <path d="M10 -4 l10 10 M14 -8 q6 0 8 6" />
        </>
      );
    case 'city':
      return (
        <>
          <path d="M-16 8 v-10 h6 v10 M-10 8 v-16 l4 -5 l4 5 v16 M-2 8 v-8 h8 v8 M6 8 v-12 h7 v12" />
          <path d="M-18 8 h33" />
        </>
      );
    case 'castle':
      return (
        <>
          <path d="M-14 8 v-14 h3 v3 h3 v-3 h3 v3 h3 v-3 h3 v3 h3 v-3 h3 v14 Z" />
          <path d="M-3 8 v-6 a3 3 0 0 1 6 0 v6" />
        </>
      );
    case 'coastal_port':
      return (
        <>
          <circle cx="0" cy="-9" r="2.5" />
          <path d="M0 -6.5 V8 M-6 -2 h12 M-10 2 q2 7 10 6 q8 1 10 -6" />
        </>
      );
  }
}

/** Compass rose for the sea corner. */
export function CompassRose({ x, y, size = 42 }: { x: number; y: number; size?: number }) {
  const s = size;
  return (
    <g className="compass" transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={s * 0.72} className="compass__ring" />
      <circle r={s * 0.62} className="compass__ring compass__ring--thin" />
      <path d={`M0 ${-s} L${s * 0.14} 0 L0 ${s} L${-s * 0.14} 0 Z`} className="compass__needle" />
      <path d={`M${-s} 0 L0 ${s * 0.14} L${s} 0 L0 ${-s * 0.14} Z`} className="compass__needle compass__needle--light" />
      <path d={`M0 ${-s} L${s * 0.14} 0 L0 0 Z`} className="compass__north" />
      <text y={-s - 6} className="compass__n">
        N
      </text>
    </g>
  );
}
