import { tr } from '../../i18n/i18n';
import type { Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../engine/GameEngine';
import { DIPLOMATIC_ACTIONS, checkDiplomacy, type DiplomaticAction } from '../../engine/DiplomacyManager';
import { getRelation } from '../../engine/relations';
import { getKingdomList, getProvincesOwnedBy } from '../../engine/selectors';
import { Modal } from '../common/Modal';

const ACTIONS: DiplomaticAction[] = ['send_gifts', 'propose_alliance', 'demand_tribute', 'threaten', 'negotiate_peace', 'declare_war'];
const STANCE = { war: 'At war', peace: 'At peace', truce: 'Truce', alliance: 'Allied' } as const;

/** The chancery: one envoy per rival per year. */
export function DiplomacyModal({ state, dispatch, onClose, bare = false }: { state: GameState; dispatch: Dispatch<GameAction>; onClose: () => void; bare?: boolean }) {
  const player = state.kingdoms[state.playerKingdomId]!;
  const rivals = getKingdomList(state).filter((k) => !k.isPlayer);
  const recent = state.chronicle.filter((c) => c.kind === 'diplomacy' && c.year === state.year).slice(-3).reverse();

  const body = (
    <>
      {rivals.map((k) => {
        const relation = getRelation(state, player.id, k.id);
        if (!relation) return null;
        const ratio = player.resources.military / Math.max(1, k.resources.military);
        const portrait = k.id === 'draven' ? 'lord' : 'lady';
        return (
          <section key={k.id} className="court" style={{ ['--realm' as string]: k.color }}>
            <header className="court__head">
              <span className={`court__portrait court__portrait--${portrait}`} aria-hidden="true" />
              <h3 className="court__name">{tr(k.name)}</h3>
              <span className={`court__stance court__stance--${relation.stance}`}>
                {tr(k.isEliminated ? 'Fallen' : STANCE[relation.stance])}
                {relation.stance === 'truce' && relation.truceUntil ? ` (${relation.truceUntil})` : ''}
              </span>
            </header>
            {!k.isEliminated && (
              <>
                <p className="small">{tr('Opinion of you:')}{' '}<strong>{relation.opinion > 0 ? '+' : ''}{relation.opinion}</strong> · {getProvincesOwnedBy(state, k.id).length}{' '}{tr('provinces · your army is')}{' '}{tr(ratio >= 1.5 ? 'far stronger' : ratio >= 1.1 ? 'stronger' : ratio > 0.9 ? 'about equal' : 'weaker')}
                  {relation.stance === 'war' && relation.warSince !== null ? ` · ${tr(`at war since ${relation.warSince}`)}` : ''}
                </p>
                <div className="court__actions">
                  {ACTIONS.map((a) => {
                    const check = checkDiplomacy(state, k.id, a);
                    return (
                      <button
                        key={a}
                        className={`btn btn--small ${a === 'declare_war' ? 'btn--danger' : 'btn--ghost-dark'}`}
                        disabled={!check.ok}
                        title={tr(check.ok ? DIPLOMATIC_ACTIONS[a].description : check.reason)}
                        onClick={() => dispatch({ type: 'DIPLOMACY', kingdomId: k.id, action: a })}
                      >
                        {tr(DIPLOMATIC_ACTIONS[a].label)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        );
      })}
      {recent.length > 0 && (
        <div className="notice">
          {recent.map((c) => (
            <div key={c.id}>{tr(c.message)}</div>
          ))}
        </div>
      )}
    </>
  );
  if (bare) return body;
  return (
    <Modal title={tr('The Chancery')} subtitle={tr('One envoy to each court per year')} onClose={onClose}>
      {body}
    </Modal>
  );
}
