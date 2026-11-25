import type { DiplomaticStance, KingdomId, ResourceDelta } from '../../types/kingdom';
import type { ProvinceId } from '../../types/province';

/**
 * Scenario mode (GDD §2B): short, replayable challenges on the same engine.
 * A scenario is data: changes applied to the standard starting state.
 */
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  objectiveId: string;
  /** Years available to complete the objective. */
  yearLimit: number;
  /** Resource values set (not added) per kingdom. */
  resources?: Partial<Record<KingdomId, ResourceDelta>>;
  stances?: { a: KingdomId; b: KingdomId; stance: DiplomaticStance; opinion: number }[];
  owners?: Partial<Record<ProvinceId, KingdomId>>;
  provinceStability?: Partial<Record<ProvinceId, number>>;
}

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'hungry_years',
    name: 'The Hungry Years',
    description: 'Blight has ruined two harvests. The granaries are nearly bare and the treasury must buy bread. Avoid famine for 8 years.',
    objectiveId: 'survive_the_winter',
    yearLimit: 12,
    resources: { ardenhal: { food: 4, gold: 30 } },
    provinceStability: { thornfield: 22, greenvale: 30 },
  },
  {
    id: 'iron_tide',
    name: 'The Iron Tide',
    description: 'Draven has marched with a vast host. Saltmere, fearing it is next, stands with you. Hold your capital for 10 years.',
    objectiveId: 'hold_the_line',
    yearLimit: 10,
    resources: { draven: { military: 60, gold: 40, food: 60 }, ardenhal: { military: 22 } },
    stances: [
      { a: 'ardenhal', b: 'draven', stance: 'war', opinion: -60 },
      { a: 'ardenhal', b: 'saltmere', stance: 'alliance', opinion: 40 },
      { a: 'draven', b: 'saltmere', stance: 'war', opinion: -40 },
    ],
  },
  {
    id: 'restoration',
    name: 'The Swift Restoration',
    description: 'The old king left you a war chest and loyal knights. Retake both lost provinces within 12 years.',
    objectiveId: 'swift_restoration',
    yearLimit: 12,
    resources: { ardenhal: { gold: 45, military: 28, legitimacy: 55 } },
  },
];
