import type { KeyboardEvent } from 'react';
import { tr } from '../../i18n/i18n';
import type { CardCategory, CardDefinition, CardTargetKind } from '../../types/card';
import { CATEGORY_LABEL, costLines, effectLines, requirementText } from './formatCard';

interface CardViewProps {
  card: CardDefinition;
  selected?: boolean;
  playable?: boolean;
  onSelect?: () => void;
}

const TARGET_SHORT: Record<CardTargetKind, string> = {
  none: '',
  own_province: 'Your province',
  enemy_province: 'Enemy province',
  kingdom: 'Rival kingdom',
};

const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' } as const;

/** Small engraved icon for each card category. */
export function CategoryIcon({ category }: { category: CardCategory }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (category) {
    case 'economy':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M9.5 10h4a2 2 0 0 1 0 4h-4" />
        </svg>
      );
    case 'military':
      return (
        <svg {...common}>
          <path d="M14.5 3H21v6.5L9 21.5 2.5 15z" />
          <path d="M5 13l6 6" />
        </svg>
      );
    case 'politics':
      return (
        <svg {...common}>
          <path d="M3 18h18L19 7l-4 5-3-7-3 7-4-5z" />
        </svg>
      );
    case 'intrigue':
      return (
        <svg {...common}>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'society':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 2-5 4-5s6 2 6 5" />
        </svg>
      );
    case 'crisis':
      return (
        <svg {...common}>
          <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" />
        </svg>
      );
  }
}

export function CardView({ card, selected = false, playable = true, onSelect }: CardViewProps) {
  const cost = costLines(card.cost);
  const effects = effectLines(card.effects);
  const requirements = card.requirements.map(requirementText);
  const onKey = (e: KeyboardEvent) => {
    if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <article
      className={[
        'card',
        `card--${card.category}`,
        `card--${card.rarity}`,
        selected && 'card--selected',
        !playable && 'card--unplayable',
      ]
        .filter(Boolean)
        .join(' ')}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`${tr(card.name)}${playable ? '' : ` (${tr('cannot be played now')})`}`}
      onClick={onSelect}
      onKeyDown={onKey}
    >
      <header className="card__header">
        <span className="card__category">
          <CategoryIcon category={card.category} />
          {tr(CATEGORY_LABEL[card.category])}
        </span>
        <span className="card__rarity" title={tr(RARITY_LABEL[card.rarity])}>
          {card.rarity === 'rare' ? '◆◆' : card.rarity === 'uncommon' ? '◆' : '◇'}
        </span>
      </header>
      <h3 className="card__name">{tr(card.name)}</h3>

      <dl className="card__rows">
        <div className="card__row">
          <dt>{tr('Cost')}</dt>
          <dd>
            {cost.length === 0 ? (
              <span className="card__line card__line--free">{tr('Free')}</span>
            ) : (
              cost.map((c) => (
                <span key={c.resource} className="card__line card__line--cost">
                  {tr(c.text)}
                </span>
              ))
            )}
          </dd>
        </div>
        <div className="card__row">
          <dt>{tr('Effect')}</dt>
          <dd>
            {effects.map((e, i) => (
              <span key={i} className={`card__line ${e.positive ? 'card__line--up' : 'card__line--down'}`}>
                {tr(e.text)}
              </span>
            ))}
          </dd>
        </div>
        {requirements.length > 0 && (
          <div className="card__row">
            <dt>{tr('Requires')}</dt>
            <dd className="card__req">{requirements.map((r) => tr(r)).join(' · ')}</dd>
          </div>
        )}
        {card.target !== 'none' && (
          <div className="card__row">
            <dt>{tr('Target')}</dt>
            <dd className="card__target">{tr(TARGET_SHORT[card.target])}</dd>
          </div>
        )}
      </dl>

      <p className="card__desc">{tr(card.description)}</p>
    </article>
  );
}
