import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { EconomyBreakdown } from '../../types/economy';
import { getPlayerKingdom, getProvincesOwnedBy, getRawProvinceTotals } from '../../engine/selectors';
import { ECONOMY } from '../../data/economy/economyRules';
import { MILITARY } from '../../data/military/militaryRules';

export interface Modifier {
  text: string;
  tone: 'good' | 'bad' | 'warn';
}

/**
 * Standing conditions that the existing rules will apply next year, phrased for the player.
 * Derived from state and rule constants only — no new mechanics.
 */
export function kingdomModifiers(state: GameState, economy: EconomyBreakdown): Modifier[] {
  const player = getPlayerKingdom(state);
  const { stability } = player.resources;
  const owned = getProvincesOwnedBy(state, player.id);
  const out: Modifier[] = [];

  const high = owned.filter((p) => p.taxLevel === 'high').length;
  const low = owned.filter((p) => p.taxLevel === 'low').length;
  if (high > 0) out.push({ text: `High taxes in ${high} provinces: more gold, −4 stability there each year`, tone: 'warn' });
  if (low > 0) out.push({ text: `Low taxes in ${low} provinces: less gold, +3 stability there each year`, tone: 'good' });
  if (stability < ECONOMY.unrestThreshold) out.push({ text: 'Unrest is spreading: −2 stability in every province each year', tone: 'bad' });
  if (stability < ECONOMY.lowStabilityForLegitimacy) out.push({ text: 'Disorder: −2 legitimacy each year', tone: 'bad' });
  else if (stability >= ECONOMY.highStabilityForLegitimacy) out.push({ text: 'Order: +1 legitimacy each year', tone: 'good' });
  if (economy.unpaidGold > 0) out.push({ text: 'The treasury cannot pay the army: desertion next year', tone: 'bad' });
  if (economy.foodShortfall > 0) out.push({ text: 'The granaries will run dry: famine next year', tone: 'bad' });
  const occupied = owned.filter((p) => p.conqueredYear !== null && state.year - p.conqueredYear < MILITARY.occupationYears).length;
  if (occupied > 0) out.push({ text: `Occupied lands pay half taxes: ${occupied} provinces`, tone: 'warn' });
  const bonus = state.battleBonus[player.id] ?? 0;
  if (bonus > 0) out.push({ text: `Battle preparations: +${bonus * 10}% in the next battle`, tone: 'good' });
  if (state.crisisYears > 0) out.push({ text: 'Total collapse looms: one more such year ends the reign', tone: 'bad' });
  return out;
}

const signed = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

export function KingdomSection({ state, economy, onOpenTreasury }: { state: GameState; economy: EconomyBreakdown; onOpenTreasury: () => void }) {
  const player = getPlayerKingdom(state);
  const totals = getRawProvinceTotals(state, player.id);
  const capital = state.provinces[player.capitalProvinceId];
  const modifiers = kingdomModifiers(state, economy);

  return (
    <>
      <dl className="kv">
        <div>
          <dt>{tr('Capital')}</dt>
          <dd>{capital?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>{tr('Provinces')}</dt>
          <dd>{totals.provinces}</dd>
        </div>
        <div>
          <dt>{tr('Garrisons')}</dt>
          <dd>{totals.garrison}</dd>
        </div>
        <div>
          <dt>{tr('Gold per year')}</dt>
          <dd className={economy.netGold < 0 ? 'neg' : 'pos'}>{signed(economy.netGold)}</dd>
        </div>
        <div>
          <dt>{tr('Food per year')}</dt>
          <dd className={economy.netFood < 0 ? 'neg' : 'pos'}>{signed(economy.netFood)}</dd>
        </div>
      </dl>
      <h3 className="acc__sub">{tr('Kingdom modifiers')}</h3>
      {modifiers.length === 0 ? (
        <p className="acc__muted">{tr('No special modifiers.')}</p>
      ) : (
        <ul className="mods">
          {modifiers.map((m) => (
            <li key={m.text} className={`mod mod--${m.tone}`}>
              {tr(m.text)}
            </li>
          ))}
        </ul>
      )}
      <button className="acc__link" onClick={onOpenTreasury}>
        {tr('Open the full ledger')} →
      </button>
    </>
  );
}
