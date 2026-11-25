import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import { PROVINCE_TYPES } from '../../data/provinces/provinceTypes';
import { provinceTaxYield } from '../../engine/EconomyManager';
import { stabilityWord } from '../provinces/provinceUi';
import { TypeIcon } from './TypeIcon';

interface Props {
  state: GameState;
  provinceId: ProvinceId;
  x: number;
  y: number;
  /** Show on the left of the pointer near the right edge. */
  flip: boolean;
  /** Show above the pointer near the bottom edge. */
  flipY?: boolean;
}

/** A compact summary that follows the pointer over the atlas. */
export function ProvinceTooltip({ state, provinceId, x, y, flip, flipY = false }: Props) {
  const p = state.provinces[provinceId];
  if (!p) return null;
  const owner = state.kingdoms[p.ownerId]!;
  const isOwn = p.ownerId === state.playerKingdomId;
  const claimed = !isOwn && p.historicalOwnerId === state.playerKingdomId;
  const siege = state.sieges.some((s) => s.provinceId === p.id);

  return (
    <div
      className={`map-tip ${flip ? 'map-tip--flip' : ''} ${flipY ? 'map-tip--up' : ''}`}
      style={{ left: x, top: y, ['--realm' as string]: owner.color }}
      role="tooltip"
    >
      <div className="map-tip__head">
        <span className={`map-tip__icon type-tint--${p.type}`}>
          <TypeIcon type={p.type} size={24} />
        </span>
        <div>
          <div className="map-tip__name">
            {p.isCapital && '♛ '}
            {p.name}
          </div>
          <div className="map-tip__owner">
            {tr(owner.name)} · {tr(PROVINCE_TYPES[p.type].label)}
          </div>
        </div>
      </div>
      <dl className="map-tip__facts">
        <div>
          <dt>{tr('Stability')}</dt>
          <dd className={p.stability < 35 ? 'neg' : undefined}>
            {p.stability} · {tr(stabilityWord(p.stability))}
          </dd>
        </div>
        <div>
          <dt>{tr('Taxes')}</dt>
          <dd>
            {provinceTaxYield(p, state.year).toFixed(1)} {tr('gold/yr')}
          </dd>
        </div>
        <div>
          <dt>{tr('Harvest')}</dt>
          <dd>
            {p.foodProduction} {tr('food')}
          </dd>
        </div>
        <div>
          <dt>{tr('Defense')}</dt>
          <dd>
            {tr('Garrison')} {p.garrison} · {tr('Fortification')} {p.fortification}/3
          </dd>
        </div>
      </dl>
      {(claimed || siege) && (
        <div className="map-tip__flags">
          {claimed && <span className="map-tip__flag">{tr('Ancestral claim')}</span>}
          {siege && <span className="map-tip__flag map-tip__flag--danger">{tr('Under siege')}</span>}
        </div>
      )}
    </div>
  );
}
