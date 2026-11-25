import type { Dispatch } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { ProvinceId } from '../../types/province';
import type { ProvinceActionKind } from '../../types/economy';
import type { GameAction } from '../../engine/GameEngine';
import { checkProvinceAction, checkRecruit, provinceActionCost, recruitCost } from '../../engine/ProvinceManager';
import { attackableProvinces, checkAttack } from '../../engine/CombatManager';
import { getProvincesOwnedBy } from '../../engine/selectors';
import { PROVINCE_ACTIONS } from '../../data/economy/economyRules';
import { costLines } from '../cards/formatCard';
import type { StartTargeting } from './targeting';

export type OpKind = ProvinceActionKind | 'recruit' | 'attack';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  startTargeting: StartTargeting;
  onAttack: (id: ProvinceId) => void;
  kinds: OpKind[];
}

const costText = (cost: Parameters<typeof costLines>[0]) => costLines(cost).map((c) => tr(c.text)).join(' ') || tr('Free');

/** How many recruits a province can raise right now (its potential, limited by gold and food). */
export function recruitAmount(state: GameState, id: ProvinceId): number {
  const p = state.provinces[id];
  const r = state.kingdoms[state.playerKingdomId]!.resources;
  if (!p) return 0;
  return Math.max(0, Math.min(p.recruitmentPotential, Math.floor(r.gold / 2), r.food));
}

const OP_INFO: Record<OpKind, { label: string; description: string }> = {
  develop_infrastructure: PROVINCE_ACTIONS.develop_infrastructure,
  improve_food: PROVINCE_ACTIONS.improve_food,
  build_defenses: PROVINCE_ACTIONS.build_defenses,
  suppress_unrest: PROVINCE_ACTIONS.suppress_unrest,
  recruit: { label: 'Recruit soldiers', description: 'Raise troops in one of your provinces, up to its potential.' },
  attack: { label: 'Attack a province', description: 'Choose a bordering enemy province, then commit troops.' },
};

/**
 * Operations launched from the navigation panel that ask for a target on the map.
 * Validity and costs come from the existing engine checks; confirming dispatches existing actions.
 */
export function ProvinceOps({ state, dispatch, startTargeting, onAttack, kinds }: Props) {
  const me = state.playerKingdomId;
  const own = getProvincesOwnedBy(state, me);

  const build = (kind: OpKind) => {
    if (kind === 'recruit') {
      const valid = own.filter((p) => {
        const n = recruitAmount(state, p.id);
        return n > 0 && checkRecruit(state, p.id, n).ok;
      });
      return {
        validIds: valid.map((p) => p.id),
        describe: (id: ProvinceId) => {
          const n = recruitAmount(state, id);
          return `+${n} ${tr('military')} · ${costText(recruitCost(n))}`;
        },
        confirm: (id: ProvinceId) => dispatch({ type: 'RECRUIT', provinceId: id, amount: recruitAmount(state, id) }),
      };
    }
    if (kind === 'attack') {
      const mil = Math.max(1, state.kingdoms[me]!.resources.military);
      const valid = attackableProvinces(state, me).filter((p) => checkAttack(state, me, p.id, mil).ok);
      return {
        validIds: valid.map((p) => p.id),
        describe: (id: ProvinceId) => {
          const c = checkAttack(state, me, id, mil);
          return tr(c.ok && c.startsSiege ? 'Requires a siege' : 'Battle');
        },
        confirm: (id: ProvinceId) => onAttack(id),
      };
    }
    const valid = own.filter((p) => checkProvinceAction(state, p.id, kind).ok);
    return {
      validIds: valid.map((p) => p.id),
      describe: (id: ProvinceId) => costText(provinceActionCost(state, id, kind)),
      confirm: (id: ProvinceId) => dispatch({ type: 'PROVINCE_ACTION', provinceId: id, action: kind }),
    };
  };

  return (
    <ul className="ops">
      {kinds.map((kind) => {
        const op = build(kind);
        const info = OP_INFO[kind];
        const n = op.validIds.length;
        return (
          <li key={kind}>
            <button
              className="op"
              disabled={n === 0 || state.status !== 'ongoing'}
              onClick={() => startTargeting({ label: info.label, ...op })}
            >
              <span className="op__label">{tr(info.label)}</span>
              <span className={`op__count ${n === 0 ? 'op__count--none' : ''}`}>{tr(`${n} valid provinces`)}</span>
              <span className="op__desc">{tr(info.description)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
