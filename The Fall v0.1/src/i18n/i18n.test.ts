import { tr } from './i18n';
import { CARD_DEFINITIONS } from '../data/cards/cards';
import { EVENTS } from '../data/events/events';
import { OBJECTIVES } from '../data/objectives/objectives';
import { SCENARIOS } from '../data/scenarios/scenarios';
import { PROVINCE_TRAITS } from '../data/provinces/traits';
import { PROVINCE_TYPES } from '../data/provinces/provinceTypes';
import { TACTICS } from '../data/military/militaryRules';
import { PROVINCE_ACTIONS } from '../data/economy/economyRules';
import { KINGDOMS } from '../data/kingdoms/kingdoms';
import { DIPLOMATIC_ACTIONS } from '../engine/DiplomacyManager';
import { createNewCampaign } from '../engine/GameEngine';
import { advanceYear } from '../engine/testUtils';
import { effectLines, costLines, requirementText } from '../components/cards/formatCard';

function contentStrings(): string[] {
  const s: string[] = [];
  CARD_DEFINITIONS.forEach((c) => s.push(c.name, c.description));
  EVENTS.forEach((e) => {
    s.push(e.name, e.description);
    e.choices.forEach((c) => {
      s.push(c.label, c.description);
      c.delayed.forEach((d) => s.push(d.description));
    });
  });
  OBJECTIVES.forEach((o) => s.push(o.name, o.description, o.reward));
  SCENARIOS.forEach((o) => s.push(o.name, o.description));
  Object.values(PROVINCE_TRAITS).forEach((o) => s.push(o.name, o.description));
  Object.values(PROVINCE_TYPES).forEach((o) => s.push(o.label, o.benefit, o.risk));
  Object.values(TACTICS).forEach((o) => s.push(o.label, o.description));
  Object.values(DIPLOMATIC_ACTIONS).forEach((o) => s.push(o.label, o.description));
  Object.values(PROVINCE_ACTIONS).forEach((o) => s.push(o.label, o.description));
  KINGDOMS.forEach((k) => s.push(k.name));
  return s;
}

describe('Azerbaijani translation', () => {
  it('English is the identity', () => {
    expect(tr('End Year', 'en')).toBe('End Year');
  });

  it('covers every piece of game content', () => {
    const missing = contentStrings().filter((x) => tr(x, 'az') === x);
    expect(missing).toEqual([]);
  });

  it('covers card effect, cost and requirement lines', () => {
    const lines = CARD_DEFINITIONS.flatMap((c) => [
      ...effectLines(c.effects).map((l) => l.text),
      ...costLines(c.cost).map((l) => l.text),
      ...c.requirements.map(requirementText),
    ]);
    expect(lines.filter((x) => tr(x, 'az') === x)).toEqual([]);
  });

  it('translates dynamic chronicle messages from a played campaign', () => {
    let s = createNewCampaign({ seed: 'i18n' });
    for (let i = 0; i < 12 && s.status === 'ongoing'; i++) s = advanceYear(s);
    const untranslated = s.chronicle.map((c) => c.message).filter((m) => tr(m, 'az') === m);
    expect(untranslated).toEqual([]);
  });

  it('keeps placeholders in event texts', () => {
    expect(tr('Drought', 'az')).toBe('Quraqlıq');
    expect(tr(EVENTS.find((e) => e.id === 'drought')!.description, 'az')).toContain('{province}');
  });
});
