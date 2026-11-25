import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import { eventText, getEventDefinition } from '../../engine/EventManager';

const SEVERITY_LABEL = { crisis: 'Crisis', warning: 'Warning', opportunity: 'Opportunity' } as const;

export function EventsSection({ state }: { state: GameState }) {
  const active = state.activeEvents;
  const brewing = state.delayedEffects;
  const history = [...state.chronicle].reverse().slice(0, 14);

  return (
    <>
      <h3 className="acc__sub">{tr('Active crises')}</h3>
      {active.length === 0 ? (
        <p className="acc__muted">{tr('The realm is quiet. For now.')}</p>
      ) : (
        <ul className="elist">
          {active.map((e) => {
            const def = getEventDefinition(e.definitionId);
            return (
              <li key={e.instanceId} className={`elist__row sev--${def.severity}`}>
                <span className={`sev sev--${def.severity}`}>{tr(SEVERITY_LABEL[def.severity])}</span>
                <span className="elist__name">{tr(def.name)}</span>
                <span className="elist__text">{eventText(state, e, tr(def.description))}</span>
              </li>
            );
          })}
        </ul>
      )}

      {brewing.length > 0 && (
        <>
          <h3 className="acc__sub">{tr('Brewing consequences')}</h3>
          <ul className="elist">
            {brewing.map((d) => (
              <li key={d.id} className="elist__row sev--warning">
                <span className="sev sev--warning">{d.triggerYear}</span>
                <span className="elist__name">{tr(getEventDefinition(d.sourceId).name)}</span>
                <span className="elist__text">{tr(d.description)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="acc__sub">{tr('Chronicle')}</h3>
      <ol className="chron">
        {history.map((c) => (
          <li key={c.id} className={`chron__row chron__row--${c.kind}`}>
            <span className="chron__year">{c.year}</span>
            <span>{tr(c.message)}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
