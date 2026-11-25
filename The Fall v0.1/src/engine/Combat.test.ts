import { createNewCampaign, gameReducer } from './GameEngine';
import { attack, attackableProvinces, checkAttack, estimateBattle, assaultSiege, advanceSieges } from './CombatManager';
import { checkRecruit, recruit } from './ProvinceManager';
import { computeEconomy } from './EconomyManager';
import { getRelation } from './relations';
import { validateGameState } from './validation';
import type { GameState } from '../types/game';

const fresh = () => createNewCampaign({ seed: 'war' });
/** A campaign where Ardenhal has raised a large army. */
const strong = () => {
  const s = structuredClone(fresh());
  s.kingdoms['ardenhal']!.resources.military = 40;
  return s;
};
const mil = (s: GameState, k = 'ardenhal') => s.kingdoms[k]!.resources.military;

describe('recruitment', () => {
  it('raises troops for gold and food, once per province per year, within potential', () => {
    const s = fresh();
    expect(checkRecruit(s, 'highwatch', 5).ok).toBe(false); // potential 4
    const a = recruit(s, 'highwatch', 4);
    expect(mil(a)).toBe(19);
    expect(a.kingdoms['ardenhal']!.resources.gold).toBe(12);
    expect(a.kingdoms['ardenhal']!.resources.food).toBe(21);
    expect(a.provinces['highwatch']!.stability).toBe(42);
    expect(checkRecruit(a, 'highwatch', 1)).toMatchObject({ ok: false, reason: 'Already recruited here this year.' });
  });
});

describe('attack eligibility', () => {
  it('only allows provinces connected to the attacker', () => {
    const s = fresh();
    const targets = attackableProvinces(s, 'ardenhal').map((p) => p.id).sort();
    expect(targets).toEqual(['ambermoor', 'brightwater', 'draven_hold', 'grimpass', 'ironridge']);
    expect(checkAttack(s, 'ardenhal', 'copperdeep', 5)).toMatchObject({ ok: false });
    expect(checkAttack(s, 'ardenhal', 'ironridge', 99)).toMatchObject({ ok: false });
    expect(checkAttack(s, 'ardenhal', 'ironridge', 10)).toMatchObject({ ok: true, startsSiege: false, breaksPeace: true });
    expect(checkAttack(s, 'ardenhal', 'draven_hold', 10)).toMatchObject({ ok: true, startsSiege: true });
  });
});

describe('battles', () => {
  it('produce calculated outcomes and declare war', () => {
    const s = strong();
    const est = estimateBattle(s, 'ardenhal', 'ironridge', 40);
    const { state, report } = attack(s, 'ardenhal', 'ironridge', 40, 'balanced');
    expect(report).not.toBeNull();
    expect(report!.attackerPower).toBeGreaterThan(0);
    expect(getRelation(state, 'ardenhal', 'draven')?.stance).toBe('war');
    expect(state.kingdoms['ardenhal']!.resources.legitimacy).toBeLessThanOrEqual(40 - 3 + 5);
    // A crushing ratio always wins.
    expect(est.ratio).toBeGreaterThan(1.35);
    expect(report!.outcome).toBe('victory');
    expect(validateGameState(state)).toEqual([]);
  });

  it('transfers ownership with post-conquest consequences', () => {
    const { state } = attack(strong(), 'ardenhal', 'ironridge', 40, 'balanced');
    const p = state.provinces['ironridge']!;
    expect(p.ownerId).toBe('ardenhal');
    expect(p.conqueredYear).toBe(state.year);
    expect(p.stability).toBe(35); // reclaimed ancestral land
    expect(p.garrison).toBeGreaterThanOrEqual(1);
    // Occupation halves taxes and administration rises with the extra province.
    const before = computeEconomy(fresh(), 'ardenhal');
    const after = computeEconomy(state, 'ardenhal');
    expect(after.administration).toBeGreaterThan(before.administration);
    // Troops are conserved: committed = survivors returned + garrison + losses.
    const report = state.battles.at(-1)!;
    expect(mil(state) + p.garrison + report.attackerLosses).toBe(40);
  });

  it('tactical choices change the result through the calculation', () => {
    const s = fresh();
    const open = estimateBattle(s, 'ardenhal', 'ambermoor', 6, 'flanking').attack;
    const openBalanced = estimateBattle(s, 'ardenhal', 'ambermoor', 6, 'balanced').attack;
    const pass = estimateBattle(s, 'ardenhal', 'grimpass', 6, 'flanking').attack;
    expect(open).toBeGreaterThan(openBalanced);
    expect(pass).toBeLessThan(openBalanced);
    expect(estimateBattle(s, 'ardenhal', 'ambermoor', 6, 'aggressive').attack).toBeGreaterThan(openBalanced);

    // Same dice, different tactic: a hopeless aggressive attack loses more men than a defensive one.
    const agg = attack(s, 'ardenhal', 'ambermoor', 2, 'aggressive').report!;
    const def = attack(s, 'ardenhal', 'ambermoor', 2, 'defensive').report!;
    expect(agg.outcome).toBe('defeat');
    expect(def.outcome).toBe('defeat');
    expect(agg.attackerPower).toBeGreaterThan(def.attackerPower);
    expect(agg.attackerLosses).toBeGreaterThan(def.attackerLosses);
  });

  it('retreat preserves most of the army without fighting', () => {
    const { state, report } = attack(fresh(), 'ardenhal', 'ironridge', 10, 'retreat');
    expect(report!.outcome).toBe('retreat');
    expect(mil(state)).toBe(14);
    expect(state.provinces['ironridge']!.ownerId).toBe('draven');
  });

  it('cannot attack an ally', () => {
    const s = structuredClone(fresh());
    s.relations = s.relations.map((r) => ({ ...r, stance: 'alliance' as const }));
    expect(checkAttack(s, 'ardenhal', 'ironridge', 5)).toMatchObject({ ok: false });
  });
});

describe('sieges', () => {
  it('fortified provinces are besieged, walls wear down, then can be stormed', () => {
    let s = structuredClone(fresh());
    s.kingdoms['ardenhal']!.resources.military = 40;
    const started = attack(s, 'ardenhal', 'draven_hold', 30, 'balanced');
    expect(started.report?.outcome).toBe('siege_started');
    s = started.state;
    expect(s.sieges).toHaveLength(1);
    expect(mil(s)).toBe(10);

    s = advanceSieges(s);
    expect(s.sieges[0]!.progress).toBe(1);
    expect(s.sieges[0]!.army).toBe(27);

    const siegeId = s.sieges[0]!.id;
    const stormed = assaultSiege(s, siegeId, 'aggressive');
    expect(stormed.report).not.toBeNull();
    expect(stormed.state.sieges).toHaveLength(0);
    expect(validateGameState(stormed.state)).toEqual([]);
  });

  it('siege cards add an advantage', () => {
    let s = structuredClone(fresh());
    s.kingdoms['ardenhal']!.resources.military = 40;
    s = attack(s, 'ardenhal', 'draven_hold', 30, 'balanced').state;
    s = { ...s, deck: { ...s.deck, hand: [{ instanceId: 'x', definitionId: 'siege_preparations' }] } };
    s = gameReducer(s, { type: 'PLAY_CARD', instanceId: 'x' });
    expect(s.sieges[0]!.bonus).toBe(3);
  });

  it('capturing the player capital ends the campaign', () => {
    const s = structuredClone(fresh());
    s.kingdoms['draven']!.resources.military = 200;
    s.provinces['ardenhal_crown']!.fortification = 0;
    s.provinces['highwatch']!.ownerId = 'draven';
    const out = attack(s, 'draven', 'ardenhal_crown', 150, 'aggressive').state;
    expect(out.provinces['ardenhal_crown']!.ownerId).toBe('draven');
    expect(gameReducer(out, { type: 'END_YEAR' }).status).toBe('defeat');
  });
});
