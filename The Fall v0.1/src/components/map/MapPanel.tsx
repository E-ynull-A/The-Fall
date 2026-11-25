import { useRef, useState } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import { getKingdomList } from '../../engine/selectors';
import { KingdomMap } from './KingdomMap';
import { ProvinceTooltip } from './ProvinceTooltip';

interface MapPanelProps {
  state: GameState;
  selectedId: ProvinceId | null;
  onSelect: (id: ProvinceId | null) => void;
  /** While an operation awaits a target: the provinces that may be chosen. */
  targetIds?: ProvinceId[] | null;
}

interface Hover {
  id: ProvinceId;
  x: number;
  y: number;
}

/** The atlas frame: map, hover tooltip and legend. */
export function MapPanel({ state, selectedId, onSelect, targetIds = null }: MapPanelProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const onHover = (id: ProvinceId | null, clientX?: number, clientY?: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!id || !rect || clientX === undefined || clientY === undefined) {
      setHover(null);
      return;
    }
    setHover({ id, x: clientX - rect.left, y: clientY - rect.top });
  };

  const width = frame.current?.clientWidth ?? 0;
  const height = frame.current?.clientHeight ?? 0;

  return (
    <div className="atlas" ref={frame}>
      <KingdomMap state={state} selectedId={selectedId} onSelect={onSelect} hoveredId={hover?.id ?? null} onHover={onHover} targetIds={targetIds} />
      {hover && <ProvinceTooltip state={state} provinceId={hover.id} x={hover.x} y={hover.y} flip={hover.x > width - 260} flipY={hover.y > height - 210} />}
      <div className="atlas__legend" aria-label={tr('Map legend')}>
        {getKingdomList(state).map((k) => (
          <span key={k.id} className="legend__item">
            <span className="legend__swatch" style={{ background: k.color }} />
            {k.shortName}
            {k.isPlayer && <em className="legend__you"> {tr('(you)')}</em>}
          </span>
        ))}
        <span className="legend__item">
          <span className="legend__swatch legend__swatch--claim" />
          {tr('Ancestral claim')}
        </span>
      </div>
      {!selectedId && !targetIds && <p className="atlas__hint">{tr('Select a province to inspect it.')}</p>}
    </div>
  );
}
