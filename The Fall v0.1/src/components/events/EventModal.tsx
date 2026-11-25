import { tr } from '../../i18n/i18n';
import { useEffect } from 'react';
import { playSound } from '../../services/AudioService';
import type { Dispatch } from 'react';
import type { GameState } from '../../types/game';
import type { ActiveEvent } from '../../types/event';
import type { GameAction } from '../../engine/GameEngine';
import { eventText, getEventDefinition } from '../../engine/EventManager';
import { RESOURCE_KEYS } from '../../engine/ResourceManager';
import { effectLines } from '../cards/formatCard';
import { RESOURCE_LABELS } from '../resources/ResourceStat';
import { Modal } from '../common/Modal';

/** A crisis or opportunity that demands a decision before the year can end. */
export function EventModal({ state, event, dispatch }: { state: GameState; event: ActiveEvent; dispatch: Dispatch<GameAction> }) {
  const def = getEventDefinition(event.definitionId);
  useEffect(() => playSound('event'), []);
  const remaining = state.activeEvents.length;

  return (
    <Modal
      title={tr(def.name)}
      subtitle={`Anno Domini ${state.year}${remaining > 1 ? ` · ${remaining} matters await you` : ''}`}
      tone="grave"
    >
      <p className="event__text">{eventText(state, event, tr(def.description))}</p>
      <div className="event__choices">
        {def.choices.map((choice) => {
          const lines = effectLines(choice.effects);
          return (
            <button
              key={choice.id}
              className="event-choice"
              onClick={() => dispatch({ type: 'RESOLVE_EVENT', instanceId: event.instanceId, choiceId: choice.id })}
            >
              <span className="event-choice__label">{tr(choice.label)}</span>
              <span className="event-choice__desc">{tr(choice.description)}</span>
              <span className="event-choice__effects">
                {lines.length === 0 && choice.delayed.length === 0 && <span className="muted">{tr('No immediate effect')}</span>}
                {lines.map((l, i) => (
                  <span key={i} className={`card__line ${l.positive ? 'card__line--up' : 'card__line--down'}`}>
                    {tr(l.text)}
                  </span>
                ))}
                {choice.delayed.map((d, i) => (
                  <span key={`d${i}`} className="card__line card__line--later">{tr('In')}{' '}{d.afterYears}{' '}{tr('year')}{d.afterYears > 1 ? 's' : ''}:{' '}
                    {RESOURCE_KEYS.filter((k) => d.delta[k])
                      .map((k) => `${(d.delta[k] as number) > 0 ? '+' : '−'}${Math.abs(d.delta[k] as number)} ${tr(RESOURCE_LABELS[k])}`)
                      .join(', ')}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
