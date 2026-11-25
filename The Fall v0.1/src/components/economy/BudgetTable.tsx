import { tr } from '../../i18n/i18n';
import type { EconomyBreakdown } from '../../types/economy';

function signed(v: number): string {
  if (v === 0) return '0';
  return `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
}

/** Gold and food ledger for one kingdom's year. */
export function BudgetTable({ economy }: { economy: EconomyBreakdown }) {
  return (
    <div className="ledger">
      <table className="ledger__table">
        <caption>{tr('Treasury')}</caption>
        <tbody>
          <tr>
            <th scope="row">{tr('Provincial taxes')}</th>
            <td className="up">+{economy.taxIncome}</td>
          </tr>
          <tr>
            <th scope="row">{tr('Army wages')}</th>
            <td className="down">−{economy.armyUpkeep}</td>
          </tr>
          <tr>
            <th scope="row">{tr('Garrisons')}</th>
            <td className="down">−{economy.garrisonUpkeep}</td>
          </tr>
          <tr>
            <th scope="row">{tr('Administration')}</th>
            <td className="down">−{economy.administration}</td>
          </tr>
          {economy.castleMaintenance > 0 && (
            <tr>
              <th scope="row">{tr('Castle upkeep')}</th>
              <td className="down">−{economy.castleMaintenance}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{tr('Net gold')}</th>
            <td className={economy.netGold < 0 ? 'down' : 'up'}>{signed(economy.netGold)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="ledger__table">
        <caption>{tr('Granaries')}</caption>
        <tbody>
          <tr>
            <th scope="row">{tr('Harvest')}</th>
            <td className="up">+{economy.foodProduced}</td>
          </tr>
          <tr>
            <th scope="row">{tr('The people')}</th>
            <td className="down">−{economy.foodPopulation}</td>
          </tr>
          <tr>
            <th scope="row">{tr('The army')}</th>
            <td className="down">−{economy.foodArmy}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{tr('Net food')}</th>
            <td className={economy.netFood < 0 ? 'down' : 'up'}>{signed(economy.netFood)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
