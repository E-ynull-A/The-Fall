import type { ProvinceType } from '../../types/province';
import { ProvinceGlyph } from './MapGlyphs';

/** The province-type glyph from the atlas, as a small inline icon. */
export function TypeIcon({ type, size = 28 }: { type: ProvinceType; size?: number }) {
  return (
    <svg className={`type-icon type-icon--${type}`} width={size} height={size} viewBox="-22 -16 44 30" aria-hidden>
      <ProvinceGlyph type={type} x={0} y={0} />
    </svg>
  );
}
