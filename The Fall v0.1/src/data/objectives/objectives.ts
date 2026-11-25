import type { ObjectiveDefinition } from '../../types/objective';

/**
 * GDD §10. Six campaign objectives that pull the campaign in different directions,
 * plus objectives used only by scenarios.
 */
export const OBJECTIVES: readonly ObjectiveDefinition[] = [
  {
    id: 'reclaim_old_borders',
    name: 'Reclaim the Old Borders',
    description: 'Retake every province that belonged to Ardenhal before the fall.',
    rule: { kind: 'reclaim_historical' },
    reward: '+15 Legitimacy.',
    rewardEffects: [{ kind: 'resources', delta: { legitimacy: 15 } }],
  },
  {
    id: 'iron_crown',
    name: 'The Iron Crown',
    description: 'Bring both rival crowns to heel by taking their capitals.',
    rule: { kind: 'capture_capitals', kingdomIds: ['draven', 'saltmere'] },
    reward: '+10 Legitimacy and +10 stability in every province.',
    rewardEffects: [
      { kind: 'resources', delta: { legitimacy: 10 } },
      { kind: 'all_provinces_stability', amount: 10 },
    ],
  },
  {
    id: 'kingdom_reborn',
    name: 'A Kingdom Reborn',
    description: 'Raise Stability to 80 within 20 years.',
    rule: { kind: 'resource_by_deadline', resource: 'stability', value: 80, withinYears: 20 },
    reward: '+10 Legitimacy and +10 stability in every province.',
    rewardEffects: [
      { kind: 'resources', delta: { legitimacy: 10 } },
      { kind: 'all_provinces_stability', amount: 10 },
    ],
  },
  {
    id: 'bread_of_the_people',
    name: 'The Bread of the People',
    description: 'Avoid famine for 15 consecutive years.',
    rule: { kind: 'no_famine_streak', years: 15 },
    reward: '+20 Food and +5 Legitimacy.',
    rewardEffects: [{ kind: 'resources', delta: { food: 20, legitimacy: 5 } }],
  },
  {
    id: 'last_fortress',
    name: 'The Last Fortress',
    description: 'Survive 25 consecutive years holding no more than three provinces. Rewards defence over conquest.',
    rule: { kind: 'hold_with_few_provinces', years: 25, maxProvinces: 3 },
    reward: '+15 Legitimacy and +10 Stability.',
    rewardEffects: [{ kind: 'resources', delta: { legitimacy: 15, stability: 10 } }],
  },
  {
    id: 'unification',
    name: 'Unification',
    description: 'Unite every province of the region under your crown.',
    rule: { kind: 'unification' },
    reward: 'Final victory: the campaign ends in triumph.',
    rewardEffects: [],
    endsCampaign: true,
  },

  // ── Scenario objectives ─────────────────────────────────
  {
    id: 'survive_the_winter',
    name: 'Survive the Hungry Years',
    description: 'Go 8 consecutive years without famine.',
    rule: { kind: 'no_famine_streak', years: 8 },
    reward: 'Scenario victory.',
    rewardEffects: [],
    scenarioOnly: true,
  },
  {
    id: 'hold_the_line',
    name: 'Hold the Line',
    description: 'Keep your capital for 10 years against the Iron Tide.',
    rule: { kind: 'survive_years', years: 10 },
    reward: 'Scenario victory.',
    rewardEffects: [],
    scenarioOnly: true,
  },
  {
    id: 'swift_restoration',
    name: 'The Swift Restoration',
    description: 'Retake Brightwater and Ironridge.',
    rule: { kind: 'reclaim_historical' },
    reward: 'Scenario victory.',
    rewardEffects: [],
    scenarioOnly: true,
  },
];

export const DEFAULT_PRIMARY_OBJECTIVE = 'reclaim_old_borders';
