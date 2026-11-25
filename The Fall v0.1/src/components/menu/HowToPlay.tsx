import { tr } from '../../i18n/i18n';
/** A short guide to the game's systems. */
export function HowToPlay() {
  return (
    <div className="howto">
      <section>
        <h3>{tr('The year')}</h3>
        <p>{tr('Each turn is a year. Issue up to three decrees from your hand, manage your provinces, then press')}{' '}<b>{tr('End Year')}</b>{tr('. Your armies besiege, rivals act, events unfold, and the new year’s taxes and harvest are counted.')}</p>
      </section>
      <section>
        <h3>{tr('The five pillars')}</h3>
        <p>
          <b>{tr('Gold')}</b>{' '}{tr('pays your soldiers.')}{' '}<b>{tr('Food')}</b>{' '}{tr('feeds people and army.')}{' '}<b>{tr('Military')}</b>{' '}{tr('is your field army.')}{' '}
          <b>{tr('Stability')}</b>{' '}{tr('and')}{' '}<b>{tr('Legitimacy')}</b>{' '}{tr('keep you on the throne: if either reaches zero, the realm falls.')}</p>
      </section>
      <section>
        <h3>{tr('Provinces')}</h3>
        <p>{tr('Click a province to inspect it. Set its tax level, improve it once a year, raise troops or build walls. Low stability cuts taxes and breeds rebellion.')}</p>
      </section>
      <section>
        <h3>{tr('War')}</h3>
        <p>{tr('You can attack provinces that border your land. Walls of level 2 or more require a siege. Conquered land is restless, pays half its taxes for three years and raises administration costs. Expansion has a price.')}</p>
      </section>
      <section>
        <h3>{tr('Rivals')}</h3>
        <p>{tr('Draven is hungry and aggressive; Saltmere is rich and careful. Gifts, alliances and truces can buy time. A spy network reveals their true strength.')}</p>
      </section>
    </div>
  );
}
