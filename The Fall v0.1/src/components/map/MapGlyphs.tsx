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
          <path d="M-19 8 Q-12 -2 -5 8 Q2 -2 9 8 Q15 1 20 8" />
          <path d="M-18 12 H19 M-15 16 H16" className="glyph__shade" />
          <path d="M-10 6 V-5 M0 6 V-8 M10 6 V-4" />
          <path d="M-13 -2 q3 -5 6 0 M-3 -5 q3 -5 6 0 M7 -1 q3 -5 6 0" className="glyph__shade" />
        </>
      );
    case 'mountain_pass':
      return (
        <>
          <path d="M-24 12 L-10 -12 L3 12 Z M-5 12 L11 -17 L28 12 Z" />
          <path d="M-15 -3 L-10 -12 L-5 -4 L-10 -6 Z M5 -6 L11 -17 L18 -5 L11 -9 Z" className="glyph__snow" />
          <path d="M-22 12 Q-7 3 4 12 Q17 3 27 12" className="glyph__shade" />
          <path d="M-7 12 Q0 2 8 12" className="glyph__road" />
        </>
      );
    case 'mining_region':
      return (
        <>
          <path d="M-21 11 L-7 -12 L7 11 Z M-2 11 L10 -8 L24 11 Z" />
          <path d="M-12 11 V2 Q-7 -5 -2 2 V11 Z" />
          <path d="M8 -3 L22 10 M13 -8 L25 4 M14 -8 L8 -3" />
          <path d="M-21 13 H25" className="glyph__shade" />
        </>
      );
    case 'city':
      return (
        <>
          <path d="M-24 12 V-1 H-15 V12 M-13 12 V-12 L-5 -19 L3 -12 V12 M5 12 V-4 H15 V12 M17 12 V-9 H25 V12" />
          <path d="M-13 -12 H3 M-5 -19 V-25 M-8 -25 H-2" className="glyph__shade" />
          <path d="M-21 3 H-18 M-8 -5 H-4 M8 2 H12 M20 -3 H23" />
          <path d="M-26 13 H27" />
        </>
      );
    case 'castle':
      return (
        <>
          <path d="M-25 13 V-5 H-18 V0 H-12 V-5 H-5 V0 H2 V-5 H9 V0 H16 V-5 H23 V13 Z" />
          <path d="M-18 -5 V-14 H-7 V-5 M2 -5 V-17 H14 V-5" />
          <path d="M-18 -14 V-19 H-14 V-14 M-7 -14 V-19 H-3 V-14 M2 -17 V-22 H7 V-17 M14 -17 V-22 H18 V-17" />
          <path d="M-5 13 V3 Q0 -5 5 3 V13" />
          <path d="M-22 3 H-17 M-1 -1 H3 M18 3 H21" className="glyph__shade" />
        </>
      );
    case 'coastal_port':
      return (
        <>
          <path d="M-21 7 Q0 18 21 7 L15 13 H-15 Z" />
          <path d="M-2 5 V-17 M-2 -17 H12 L7 -10 H-2" />
          <path d="M-8 -1 L-2 -9 L5 -1" className="glyph__shade" />
          <path d="M-23 17 Q-15 13 -7 17 T9 17 T25 17" className="glyph__shade" />
          <path d="M-14 1 H-7" />
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
