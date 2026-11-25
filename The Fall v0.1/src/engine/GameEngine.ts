import { SAVE_VERSION, type GameState } from '../types/game';
import type { DiplomaticRelation, Kingdom } from '../types/kingdom';
import type { Province, ProvinceDefinition, ProvinceId } from '../types/province';
import type { ProvinceActionKind, TaxLevel } from '../types/economy';
import type { ChronicleEntry } from '../types/event';
import { KINGDOMS, PLAYER_KINGDOM_ID } from '../data/kingdoms/kingdoms';
import { PROVINCES } from '../data/provinces/provinces';
import { STARTING_DECK, STARTING_HAND_SIZE } from '../data/cards/cards';
import { DEFAULT_PRIMARY_OBJECTIVE, OBJECTIVES } from '../data/objectives/objectives';
import { buildDeck, playCard, redrawCard, refillHand, type CardTarget } from './CardManager';
import { seedFrom } from '../utils/random';
import { SCENARIOS } from '../data/scenarios/scenarios';
import { clampResources } from './ResourceManager';
import { checkDefeat, endYear } from './TurnManager';
import { performProvinceAction, recruit, setTaxLevel } from './ProvinceManager';
import { assaultSiege, attack, liftSiege } from './CombatManager';
import type { Tactic } from '../types/military';
import { resolveEvent } from './EventManager';
import { performDiplomacy, type DiplomaticAction } from './DiplomacyManager';

export const CAMPAIGN_START_YEAR = 1187;

export interface NewCampaignOptions {
  seed?: string | number;
  campaignId?: string;
  /** Start a scenario instead of the main campaign. */
  scenarioId?: string;
}

function cloneKingdom(k: Kingdom): Kingdom {
  return { ...k, resources: { ...k.resources } };
}

function createProvince(p: ProvinceDefinition): Province {
  return { ...p, neighbors: [...p.neighbors], traits: [...p.traits], taxLevel: 'normal', lastImprovedYear: null, lastRecruitedYear: null, conqueredYear: null };
}

function initialRelations(kingdoms: readonly Kingdom[]): DiplomaticRelation[] {
  const relations: DiplomaticRelation[] = [];
  for (let i = 0; i < kingdoms.length; i++) {
    for (let j = i + 1; j < kingdoms.length; j++) {
      const a = kingdoms[i] as Kingdom;
      const b = kingdoms[j] as Kingdom;
      // Both rivals took land from Ardenhal; relations with the player start cold.
      const opinion = a.isPlayer || b.isPlayer ? -20 : 0;
      relations.push({ kingdomA: a.id, kingdomB: b.id, stance: 'peace', opinion, warSince: null, truceUntil: null, lastActionYear: null });
    }
  }
  return relations;
}

/** Creates a fresh Main Campaign game state from the static data. Pure. */
export function createNewCampaign(options: NewCampaignOptions = {}): GameState {
  const seedInput = options.seed ?? Date.now();
  const campaignId = options.campaignId ?? `campaign-${seedFrom(seedInput).toString(36)}`;
  let rngState = seedFrom(seedInput);

  const built = buildDeck(STARTING_DECK, STARTING_HAND_SIZE, rngState);
  const drawn = refillHand(built.deck, built.rngState);
  rngState = drawn.rngState;

  const kingdoms = Object.fromEntries(KINGDOMS.map((k) => [k.id, cloneKingdom(k)]));
  const provinces = Object.fromEntries(PROVINCES.map((p) => [p.id, createProvince(p)]));

  const chronicle: ChronicleEntry[] = [
    {
      id: 'c1',
      year: CAMPAIGN_START_YEAR,
      kind: 'system',
      message:
        'The old king is dead. You inherit an empty treasury, thin granaries and lords who whisper of rebellion.',
    },
    {
      id: 'c2',
      year: CAMPAIGN_START_YEAR,
      kind: 'system',
      message: 'Brightwater lies in Saltmere’s hands and Ironridge under Draven’s banner. Both were once yours.',
    },
  ];

  const base: GameState = {
    saveVersion: SAVE_VERSION,
    campaignId,
    mode: 'campaign',
    rngState,
    startYear: CAMPAIGN_START_YEAR,
    year: CAMPAIGN_START_YEAR,
    phase: 'decisions',
    status: 'ongoing',
    // The opening year is treated as already resolved: the inherited stores are the year's starting position.
    lastResolvedYear: CAMPAIGN_START_YEAR,
    playerKingdomId: PLAYER_KINGDOM_ID,
    kingdoms,
    provinces,
    relations: initialRelations(KINGDOMS),
    deck: drawn.deck,
    activeEvents: [],
    delayedEffects: [],
    objectives: OBJECTIVES.filter((o) => !o.scenarioOnly).map((o) => ({ id: o.id, status: 'active', streak: 0, completedYear: null })),
    primaryObjectiveId: DEFAULT_PRIMARY_OBJECTIVE,
    pendingTriumph: null,
    crisisYears: 0,
    scenario: null,
    chronicle,
    lastYearReport: null,
    defeatReason: null,
    cardsPlayedThisYear: 0,
    cardRedrawYear: null,
    revealedUntil: {},
    battleBonus: {},
    sieges: [],
    battles: [],
    eventHistory: {},
    nextId: chronicle.length + 1,
  };
  return options.scenarioId ? applyScenario(base, options.scenarioId) : base;
}

/** Turns a fresh campaign into a scenario (GDD §2B): same engine, different start. */
export function applyScenario(state: GameState, scenarioId: string): GameState {
  const sc = SCENARIOS.find((x) => x.id === scenarioId);
  if (!sc) throw new Error(`Unknown scenario ${scenarioId}`);
  const kingdoms = { ...state.kingdoms };
  for (const [id, values] of Object.entries(sc.resources ?? {})) {
    const k = kingdoms[id];
    if (k && values) kingdoms[id] = { ...k, resources: clampResources({ ...k.resources, ...values }) };
  }
  const provinces = { ...state.provinces };
  for (const [id, owner] of Object.entries(sc.owners ?? {})) {
    const p = provinces[id];
    if (p && owner) provinces[id] = { ...p, ownerId: owner };
  }
  for (const [id, stability] of Object.entries(sc.provinceStability ?? {})) {
    const p = provinces[id];
    if (p && stability !== undefined) provinces[id] = { ...p, stability };
  }
  const relations = state.relations.map((r) => {
    const o = sc.stances?.find((x) => (x.a === r.kingdomA && x.b === r.kingdomB) || (x.a === r.kingdomB && x.b === r.kingdomA));
    return o ? { ...r, stance: o.stance, opinion: o.opinion, warSince: o.stance === 'war' ? state.year : null } : r;
  });
  return {
    ...state,
    mode: 'scenario',
    kingdoms,
    provinces,
    relations,
    objectives: [{ id: sc.objectiveId, status: 'active', streak: 0, completedYear: null }],
    primaryObjectiveId: sc.objectiveId,
    scenario: { id: sc.id, lastYear: state.startYear + sc.yearLimit - 1 },
    chronicle: [
      ...state.chronicle.slice(0, 1),
      { id: 'c2', year: state.year, kind: 'system', message: `Scenario: ${sc.name}. ${sc.description}` },
    ],
  };
}

/**
 * All state changes go through actions. Later phases add PLAY_CARD,
 * ATTACK_PROVINCE, RESOLVE_EVENT, etc.
 */
export type GameAction =
  | { type: 'NEW_CAMPAIGN'; options?: NewCampaignOptions }
  | { type: 'SET_PRIMARY_OBJECTIVE'; objectiveId: string }
  | { type: 'END_YEAR' }
  | { type: 'SET_TAX_LEVEL'; provinceId: ProvinceId; level: TaxLevel }
  | { type: 'PROVINCE_ACTION'; provinceId: ProvinceId; action: ProvinceActionKind }
  | { type: 'PLAY_CARD'; instanceId: string; target?: CardTarget }
  | { type: 'REDRAW_CARD'; instanceId: string }
  | { type: 'RECRUIT'; provinceId: ProvinceId; amount: number }
  | { type: 'ATTACK'; provinceId: ProvinceId; committed: number; tactic: Tactic }
  | { type: 'ASSAULT_SIEGE'; siegeId: string; tactic: Tactic }
  | { type: 'LIFT_SIEGE'; siegeId: string }
  | { type: 'RESOLVE_EVENT'; instanceId: string; choiceId: string }
  | { type: 'DIPLOMACY'; kingdomId: string; action: DiplomaticAction }
  | { type: 'ACK_TRIUMPH' }
  | { type: 'LOAD_STATE'; state: GameState };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_CAMPAIGN':
      return createNewCampaign(action.options);
    case 'SET_PRIMARY_OBJECTIVE': {
      const exists = state.objectives.some((o) => o.id === action.objectiveId);
      if (!exists || state.primaryObjectiveId === action.objectiveId) return state;
      return { ...state, primaryObjectiveId: action.objectiveId };
    }
    case 'END_YEAR':
      return endYear(state);
    case 'SET_TAX_LEVEL':
      return setTaxLevel(state, action.provinceId, action.level);
    case 'PROVINCE_ACTION':
      return performProvinceAction(state, action.provinceId, action.action);
    case 'PLAY_CARD':
      return playCard(state, action.instanceId, action.target);
    case 'REDRAW_CARD':
      return redrawCard(state, action.instanceId);
    case 'RECRUIT':
      return recruit(state, action.provinceId, action.amount);
    case 'ATTACK':
      return checkDefeat(attack(state, state.playerKingdomId, action.provinceId, action.committed, action.tactic).state);
    case 'ASSAULT_SIEGE': {
      const siege = state.sieges.find((s) => s.id === action.siegeId);
      if (!siege || siege.attackerId !== state.playerKingdomId) return state;
      return checkDefeat(assaultSiege(state, action.siegeId, action.tactic).state);
    }
    case 'LIFT_SIEGE': {
      const siege = state.sieges.find((s) => s.id === action.siegeId);
      if (!siege || siege.attackerId !== state.playerKingdomId) return state;
      return liftSiege(state, action.siegeId);
    }
    case 'RESOLVE_EVENT':
      return checkDefeat(resolveEvent(state, action.instanceId, action.choiceId));
    case 'DIPLOMACY':
      return checkDefeat(performDiplomacy(state, action.kingdomId, action.action));
    case 'ACK_TRIUMPH':
      return state.pendingTriumph ? { ...state, pendingTriumph: null } : state;
    case 'LOAD_STATE':
      return action.state;
  }
}
