import { advanceYear } from './testUtils';
import { createNewCampaign, gameReducer } from './GameEngine';
import { applyEconomy, computeEconomy } from './EconomyManager';
import { endYear, resolveStartOfYear } from './TurnManager';
import { checkProvinceAction } from './ProvinceManager';
import { validateGameState } from './validation';
import type { GameState } from '../types/game';

const fresh = () => createNewCampaign({ seed: 'turns' });
const player = (s: GameState) => s.kingdoms[s.playerKingdomId]!;

describe('EconomyManager', () => {
  it('computes the opening budget of Ardenhal', () => {
    const e = computeEconomy(fresh(), 'ardenhal');
    // Taxes: 7·0.70 + 3·0.65 + 2·0.725 + 1·0.75 = 9.05 → 9
    expect(e.taxIncome).toBe(9);
    // Upkeep: army ⌈15/5⌉=3, garrison ⌈13/4⌉=4, admin ⌊4·0.5⌋=2, one castle=1
    expect(e.totalExpenses).toBe(10);
    expect(e.netGold).toBe(-1);
    // Food: 16 produced; population (1+3)+(1+2)·3 = 13; army ⌈15/8⌉ = 2
    expect(e.netFood).toBe(1);
  });

  it('high taxes raise income but cost province stability', () => {
    const s = gameReducer(fresh(), { type: 'SET_TAX_LEVEL', provinceId: 'ardenhal_crown', level: 'high' });
    expect(computeEconomy(s, 'ardenhal').taxIncome).toBeGreaterThan(computeEconomy(fresh(), 'ardenhal').taxIncome);
    const after = applyEconomy(s, 'ardenhal').state;
    expect(after.provinces['ardenhal_crown']!.stability).toBe(36);
  });

  it('applies the forecast exactly', () => {
    const s = fresh();
    const forecast = computeEconomy(s, 'ardenhal');
    const after = applyEconomy(s, 'ardenhal').state;
    expect(player(after).resources.gold).toBe(player(s).resources.gold + forecast.netGold);
    expect(player(after).resources.food).toBe(player(s).resources.food + forecast.netFood);
  });

  it('famine empties the granary and hurts stability', () => {
    const s = structuredClone(fresh());
    player(s).resources.food = 0;
    s.provinces['greenvale']!.foodProduction = 0;
    s.provinces['thornfield']!.foodProduction = 0;
    const out = applyEconomy(s, 'ardenhal');
    expect(out.famine).toBe(true);
    expect(player(out.state).resources.food).toBe(0);
    expect(player(out.state).resources.stability).toBeLessThan(35);
    expect(out.state.provinces['highwatch']!.stability).toBe(45);
  });

  it('unpaid soldiers desert', () => {
    const s = structuredClone(fresh());
    player(s).resources.gold = 0;
    const out = applyEconomy(s, 'ardenhal');
    expect(out.unpaidArmy).toBe(true);
    expect(player(out.state).resources.gold).toBe(0);
    expect(player(out.state).resources.military).toBe(12);
    expect(player(out.state).resources.legitimacy).toBe(38);
  });
});

describe('TurnManager', () => {
  it('End Year advances exactly one year and runs the economy once', () => {
    const s = fresh();
    const forecast = computeEconomy(s, 'ardenhal');
    const next = endYear(s);
    expect(next.year).toBe(s.year + 1);
    expect(next.lastResolvedYear).toBe(next.year);
    expect(player(next).resources.gold).toBe(player(s).resources.gold + forecast.netGold);
    expect(next.lastYearReport?.resourceChange.gold).toBe(forecast.netGold);
    expect(validateGameState(next)).toEqual([]);
  });

  it('never resolves the same year twice', () => {
    const next = endYear(fresh());
    expect(resolveStartOfYear(next).state).toBe(next);
  });

  it('runs every kingdom’s economy', () => {
    const s = fresh();
    const draven = computeEconomy(s, 'draven');
    const next = endYear(s);
    expect(next.kingdoms['draven']!.resources.food).toBe(s.kingdoms['draven']!.resources.food + draven.netFood);
  });

  it('advances the famine streak objective', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = advanceYear(s);
    expect(s.objectives.find((o) => o.id === 'bread_of_the_people')?.streak).toBe(3);
  });

  it('ends the campaign when stability collapses and refuses further turns', () => {
    const s = structuredClone(fresh());
    player(s).resources.stability = 0;
    const lost = endYear(s);
    expect(lost.status).toBe('defeat');
    expect(lost.defeatReason).toMatch(/Order has collapsed/);
    expect(endYear(lost)).toBe(lost);
  });

  it('declares defeat when the capital is lost', () => {
    const s = structuredClone(fresh());
    s.provinces['ardenhal_crown']!.ownerId = 'draven';
    expect(endYear(s).defeatReason).toMatch(/capital/);
  });

  it('stays structurally valid over twenty years', () => {
    let s = fresh();
    for (let i = 0; i < 20 && s.status === 'ongoing'; i++) s = advanceYear(s);
    expect(validateGameState(s)).toEqual([]);
  });
});

describe('Province actions', () => {
  it('develops infrastructure for gold, once per year', () => {
    const s = fresh();
    const a = gameReducer(s, { type: 'PROVINCE_ACTION', provinceId: 'greenvale', action: 'develop_infrastructure' });
    expect(a.provinces['greenvale']!.development).toBe(3);
    expect(a.provinces['greenvale']!.taxIncome).toBe(3);
    expect(player(a).resources.gold).toBe(20 - 12);
    const b = gameReducer(a, { type: 'PROVINCE_ACTION', provinceId: 'greenvale', action: 'improve_food' });
    expect(b).toBe(a);
    expect(checkProvinceAction(a, 'greenvale', 'improve_food')).toMatchObject({ ok: false, reason: 'Already improved this year.' });
    const nextYear = endYear(a);
    expect(checkProvinceAction(nextYear, 'greenvale', 'suppress_unrest').ok).toBe(true);
  });

  it('rejects unaffordable actions and foreign provinces', () => {
    const s = structuredClone(fresh());
    player(s).resources.gold = 3;
    expect(checkProvinceAction(s, 'greenvale', 'improve_food')).toMatchObject({ ok: false, reason: 'Not enough gold.' });
    expect(checkProvinceAction(s, 'ironridge', 'suppress_unrest')).toMatchObject({ ok: false });
    expect(gameReducer(s, { type: 'SET_TAX_LEVEL', provinceId: 'ironridge', level: 'high' })).toBe(s);
  });

  it('suppressing unrest trades military and legitimacy for order', () => {
    const a = gameReducer(fresh(), { type: 'PROVINCE_ACTION', provinceId: 'thornfield', action: 'suppress_unrest' });
    expect(a.provinces['thornfield']!.stability).toBe(42);
    expect(player(a).resources.military).toBe(13);
    expect(player(a).resources.legitimacy).toBe(39);
  });
});
