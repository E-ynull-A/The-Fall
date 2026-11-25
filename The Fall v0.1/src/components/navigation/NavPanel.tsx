import type { Dispatch } from 'react';
import { tr } from '../../i18n/i18n';
import type { GameState } from '../../types/game';
import type { Province, ProvinceId } from '../../types/province';
import type { GameAction } from '../../engine/GameEngine';
import { computeEconomy } from '../../engine/EconomyManager';
import { getProvincesOwnedBy } from '../../engine/selectors';
import { NAV_SECTIONS, type NavSectionId } from './navConfig';
import type { NavAction } from './useNavigation';
import type { StartTargeting } from './targeting';
import { ProvinceOps } from './ProvinceOps';
import { PoliticsSection } from './PoliticsSection';
import { KingdomSection } from '../sidebar/KingdomSection';
import { ProvinceSection } from '../sidebar/ProvinceSection';
import { ObjectivesSection } from '../sidebar/ObjectivesSection';
import { EventsSection } from '../sidebar/EventsSection';
import { TreasuryModal } from '../economy/TreasuryModal';
import { MilitaryModal } from '../combat/MilitaryModal';
import { DiplomacyModal } from '../diplomacy/DiplomacyModal';
import { TaxControl } from '../provinces/ProvinceActions';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  section: NavSectionId;
  open: boolean;
  dispatchNav: (a: NavAction) => void;
  selected: Province | undefined;
  onSelect: (id: ProvinceId | null) => void;
  onAttack: (id: ProvinceId) => void;
  onBattle: () => void;
  startTargeting: StartTargeting;
}

/** The expandable navigation panel (push layout: it takes a grid column, never covers the map). */
export function NavPanel(props: Props) {
  const { state, dispatch, section, open, dispatchNav, selected, onSelect, onAttack, onBattle, startTargeting } = props;
  const def = NAV_SECTIONS.find((s) => s.id === section)!;
  const economy = computeEconomy(state, state.playerKingdomId);
  const noop = () => undefined;

  let content: JSX.Element;
  switch (section) {
    case 'kingdom':
      content = <KingdomSection state={state} economy={economy} onOpenTreasury={() => dispatchNav({ type: 'OPEN_SECTION', id: 'economy' })} />;
      break;
    case 'provinces':
      content = (
        <>
          <h3 className="acc__sub">{tr('Development')}</h3>
          <ProvinceOps
            state={state}
            dispatch={dispatch}
            startTargeting={startTargeting}
            onAttack={onAttack}
            kinds={['develop_infrastructure', 'improve_food']}
          />
          <h3 className="acc__sub">{selected ? tr('Selected province') : tr('Your provinces')}</h3>
          <ProvinceSection state={state} selected={selected} dispatch={dispatch} onSelect={onSelect} onAttack={onAttack} />
        </>
      );
      break;
    case 'economy':
      content = (
        <>
          <TreasuryModal state={state} onClose={noop} bare />
          <h3 className="acc__sub">{tr('Tax policy')}</h3>
          {getProvincesOwnedBy(state, state.playerKingdomId).map((p) => (
            <div key={p.id} className="taxrow">
              <span className="taxrow__name">{p.name}</span>
              <TaxControl state={state} province={p} dispatch={dispatch} />
            </div>
          ))}
        </>
      );
      break;
    case 'military':
      content = (
        <>
          <h3 className="acc__sub">{tr('Operations')}</h3>
          <ProvinceOps
            state={state}
            dispatch={dispatch}
            startTargeting={startTargeting}
            onAttack={onAttack}
            kinds={['recruit', 'attack', 'build_defenses']}
          />
          <MilitaryModal state={state} dispatch={dispatch} onAttack={onAttack} onClose={noop} onBattle={onBattle} bare />
        </>
      );
      break;
    case 'diplomacy':
      content = <DiplomacyModal state={state} dispatch={dispatch} onClose={noop} bare />;
      break;
    case 'politics':
      content = (
        <PoliticsSection
          state={state}
          economy={economy}
          dispatch={dispatch}
          startTargeting={startTargeting}
          onAttack={onAttack}
          onSelect={(id) => onSelect(id)}
        />
      );
      break;
    case 'events':
      content = <EventsSection state={state} />;
      break;
    case 'objectives':
      content = <ObjectivesSection state={state} dispatch={dispatch} />;
      break;
  }

  return (
    <aside id="nav-panel" className="navpanel" aria-label={tr(def.label)} aria-hidden={!open}>
      <header className="navpanel__head">
        <h2 className="navpanel__title">{tr(def.label)}</h2>
        <button className="icon-btn icon-btn--small" onClick={() => dispatchNav({ type: 'SET_MODE', mode: 'compact' })} aria-label={tr('Collapse panel')}>
          ‹
        </button>
      </header>
      <div className="navpanel__body">{content}</div>
    </aside>
  );
}
