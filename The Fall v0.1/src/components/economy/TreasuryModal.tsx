import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import { computeEconomy } from '../../engine/EconomyManager';
import { getPlayerKingdom } from '../../engine/selectors';
import { Modal } from '../common/Modal';
import { BudgetTable } from './BudgetTable';

const TAX_LABEL = { low: 'Low', normal: 'Normal', high: 'High' } as const;

/** Kingdom management: projected budget for the coming year, using the real economy rules. */
export function TreasuryModal({ state, onClose, bare = false }: { state: GameState; onClose: () => void; bare?: boolean }) {
  const player = getPlayerKingdom(state);
  const economy = computeEconomy(state, player.id);
  const { gold, food } = player.resources;

  const warnings: string[] = [];
  if (economy.unpaidGold > 0) warnings.push(`The treasury will be ${economy.unpaidGold} gold short. Soldiers will desert.`);
  if (economy.foodShortfall > 0) warnings.push(`The granaries will run ${economy.foodShortfall} food short. Famine follows.`);
  if (economy.netGold < 0 && economy.unpaidGold === 0) {
    const years = Math.floor(gold / -economy.netGold);
    warnings.push(`At this rate the treasury is empty in about ${years} year${years === 1 ? '' : 's'}.`);
  }

  const body = (
    <>
      <BudgetTable economy={economy} />
      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{tr(w)}</li>
          ))}
        </ul>
      )}
      <p className="muted small">{tr('Treasury')}{' '}{gold}{' '}{tr('gold, granaries')}{' '}{food}{' '}{tr('food. Taxes depend on each province’s stability and tax level.')}</p>

      <table className="ledger__table ledger__table--provinces">
        <caption>{tr('By province')}</caption>
        <thead>
          <tr>
            <th scope="col">{tr('Province')}</th>
            <th scope="col">{tr('Tax level')}</th>
            <th scope="col">{tr('Gold')}</th>
            <th scope="col">{tr('Food')}</th>
            <th scope="col">{tr('Eats')}</th>
          </tr>
        </thead>
        <tbody>
          {economy.provinceLines.map((l) => {
            const p = state.provinces[l.provinceId]!;
            return (
              <tr key={l.provinceId}>
                <th scope="row">{tr(p.name)}</th>
                <td>{tr(TAX_LABEL[p.taxLevel])}</td>
                <td>{l.gold.toFixed(1)}</td>
                <td>{l.food}</td>
                <td>{l.consumption}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
  if (bare) return body;
  return (
    <Modal title={tr('The Royal Treasury')} subtitle={`Projected for the start of ${state.year + 1}`} onClose={onClose}>
      {body}
    </Modal>
  );
}
