import { tr } from '../../i18n/i18n';
import { useEffect, useRef, useState } from 'react';
import type { ResourceKey } from '../../types/kingdom';
import { ResourceIcon } from '../common/Icons';

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  gold: 'Gold',
  food: 'Food',
  military: 'Military',
  stability: 'Stability',
  legitimacy: 'Legitimacy',
};

/** Threshold below which a resource is shown as critical. Presentation only. */
const CRITICAL: Record<ResourceKey, number> = {
  gold: 10,
  food: 10,
  military: 10,
  stability: 25,
  legitimacy: 25,
};

export function ResourceStat({ resource, value, change }: { resource: ResourceKey; value: number; change?: number }) {
  const isPercent = resource === 'stability' || resource === 'legitimacy';
  const critical = value < CRITICAL[resource];

  // Brief floating "+3 / −2" whenever the value changes during play.
  const prev = useRef(value);
  const [floats, setFloats] = useState<{ id: number; delta: number }[]>([]);
  useEffect(() => {
    const delta = value - prev.current;
    prev.current = value;
    if (delta === 0) return;
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, delta }]);
    const timer = window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600);
    return () => window.clearTimeout(timer);
  }, [value]);
  const last = floats[floats.length - 1];

  return (
    <div
      className={[
        'resource',
        critical && 'resource--critical',
        last && (last.delta > 0 ? 'resource--flash-up' : 'resource--flash-down'),
      ]
        .filter(Boolean)
        .join(' ')}
      title={tr(RESOURCE_LABELS[resource])}
    >
      {floats.map((f) => (
        <span key={f.id} className={`resource__float ${f.delta > 0 ? 'resource__float--up' : 'resource__float--down'}`} aria-hidden>
          {f.delta > 0 ? '+' : '−'}
          {Math.abs(f.delta)}
        </span>
      ))}
      <span className={`resource__icon resource__icon--${resource}`}>
        <ResourceIcon resource={resource} />
      </span>
      <span className="resource__text">
        <span className="resource__label">{tr(RESOURCE_LABELS[resource])}</span>
        <span className="resource__value">
          <span key={value} className="resource__number">
            {value}
          </span>
          {isPercent && <span className="resource__max">/100</span>}
          {change !== undefined && change !== 0 && (
            <span
              className={`resource__change ${change > 0 ? 'resource__change--up' : 'resource__change--down'}`}
              title={tr('Change since last year')}
            >
              {change > 0 ? '+' : '−'}
              {Math.abs(change)}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
