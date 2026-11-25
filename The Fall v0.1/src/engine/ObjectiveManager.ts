import type { GameState } from '../types/game';
import type { ObjectiveDefinition, ObjectiveId, ObjectiveProgress } from '../types/objective';
import { OBJECTIVES } from '../data/objectives/objectives';
import { getProvincesOwnedBy } from './selectors';

export function getObjectiveDefinition(id: ObjectiveId): ObjectiveDefinition {
  const def = OBJECTIVES.find((o) => o.id === id);
  if (!def) throw new Error(`Unknown objective: ${id}`);
  return def;
}

/**
 * Measures progress from the actual game state.
 * Streak objectives read the counter that end-of-year resolution advances (Phase 3+).
 */
export function getObjectiveProgress(state: GameState, def: ObjectiveDefinition): ObjectiveProgress {
  const player = state.playerKingdomId;
  const objectiveState = state.objectives.find((o) => o.id === def.id);
  const streak = objectiveState?.streak ?? 0;
  const rule = def.rule;

  switch (rule.kind) {
    case 'reclaim_historical': {
      const historical = Object.values(state.provinces).filter((p) => p.historicalOwnerId === player);
      const held = historical.filter((p) => p.ownerId === player).length;
      return { current: held, target: historical.length, label: `${held} / ${historical.length} ancestral provinces` };
    }
    case 'capture_capitals': {
      const held = rule.kingdomIds.filter((kid) => {
        const capitalId = state.kingdoms[kid]?.capitalProvinceId;
        return capitalId !== undefined && state.provinces[capitalId]?.ownerId === player;
      }).length;
      return { current: held, target: rule.kingdomIds.length, label: `${held} / ${rule.kingdomIds.length} rival capitals` };
    }
    case 'resource_by_deadline': {
      const value = state.kingdoms[player]?.resources[rule.resource] ?? 0;
      const yearsLeft = Math.max(0, state.startYear + rule.withinYears - state.year);
      return {
        current: Math.min(value, rule.value),
        target: rule.value,
        label: `${value} / ${rule.value} ${rule.resource} · ${yearsLeft} years left`,
      };
    }
    case 'no_famine_streak':
      return { current: streak, target: rule.years, label: `${streak} / ${rule.years} years without famine` };
    case 'hold_with_few_provinces': {
      const owned = getProvincesOwnedBy(state, player).length;
      return {
        current: streak,
        target: rule.years,
        label: `${streak} / ${rule.years} years · holding ${owned} (max ${rule.maxProvinces})`,
      };
    }
    case 'unification': {
      const total = Object.keys(state.provinces).length;
      const owned = getProvincesOwnedBy(state, player).length;
      return { current: owned, target: total, label: `${owned} / ${total} provinces` };
    }
    case 'survive_years': {
      // Counted at the end of each year, including the year being closed.
      const years = state.year - state.startYear + 1;
      return { current: Math.min(years, rule.years), target: rule.years, label: `${years} / ${rule.years} years endured` };
    }
  }
}

/**
 * End-of-year objective bookkeeping (GDD §5 Phase 5): advances streak counters,
 * marks objectives completed or failed. Returns the names of newly completed objectives.
 */
export function updateObjectivesAtYearEnd(
  state: GameState,
  famineThisYear: boolean,
): { state: GameState; completed: string[]; failed: string[] } {
  const completed: string[] = [];
  const failed: string[] = [];
  const playerProvinces = getProvincesOwnedBy(state, state.playerKingdomId).length;

  const objectives = state.objectives.map((o) => {
    if (o.status !== 'active') return o;
    const def = getObjectiveDefinition(o.id);
    let streak = o.streak;
    if (def.rule.kind === 'no_famine_streak') streak = famineThisYear ? 0 : streak + 1;
    if (def.rule.kind === 'hold_with_few_provinces') {
      streak = playerProvinces <= def.rule.maxProvinces ? streak + 1 : 0;
    }
    const updated = { ...o, streak };
    const progress = getObjectiveProgress({ ...state, objectives: [updated] }, def);
    if (progress.current >= progress.target) {
      completed.push(def.id);
      return { ...updated, status: 'completed' as const, completedYear: state.year };
    }
    if (def.rule.kind === 'resource_by_deadline' && state.year >= state.startYear + def.rule.withinYears) {
      failed.push(def.name);
      return { ...updated, status: 'failed' as const };
    }
    return updated;
  });

  return { state: { ...state, objectives }, completed, failed };
}

export function getAllObjectiveProgress(state: GameState) {
  const tracked = new Set(state.objectives.map((o) => o.id));
  return OBJECTIVES.filter((def) => tracked.has(def.id)).map((def) => ({
    definition: def,
    state: state.objectives.find((o) => o.id === def.id),
    progress: getObjectiveProgress(state, def),
  }));
}
