import { tr } from '../i18n/i18n';
import { useEffect, useReducer, useState } from 'react';
import type { GameState } from '../types/game';
import type { ProvinceId } from '../types/province';
import { gameReducer } from '../engine/GameEngine';
import type { Lang } from '../i18n/i18n';
import { saveGame } from '../services/SaveService';
import { TopBar } from '../components/layout/TopBar';
import { ActionBar } from '../components/layout/ActionBar';
import { MapPanel } from '../components/map/MapPanel';
import { CardTray } from '../components/cards/CardTray';
import { YearReportModal } from '../components/economy/YearReportModal';
import { DefeatModal } from '../components/economy/DefeatModal';
import { TriumphModal } from '../components/economy/TriumphModal';
import { AttackDialog } from '../components/combat/AttackDialog';
import { BattleReportModal } from '../components/combat/BattleReportModal';
import { EventModal } from '../components/events/EventModal';
import { GameMenu } from '../components/menu/GameMenu';
import { Toasts } from '../components/common/Toasts';
import { playSound } from '../services/AudioService';
import { NavRail, MapFocusRestore } from '../components/navigation/NavRail';
import { NavPanel } from '../components/navigation/NavPanel';
import { StatusRail } from '../components/navigation/StatusRail';
import { TargetBar } from '../components/navigation/TargetBar';
import { useNavigation } from '../components/navigation/useNavigation';
import type { Targeting } from '../components/navigation/targeting';
import type { NavSectionId } from '../components/navigation/navConfig';

type Dialog =
  | { kind: 'none' }
  | { kind: 'year_report' }
  | { kind: 'attack'; provinceId: ProvinceId }
  | { kind: 'battle'; battleCount: number }
  | { kind: 'menu' };

interface AppProps {
  initialState: GameState;
  onExit: () => void;
  onLoad: (state: GameState) => void;
  /** Current UI language; changing it re-renders the whole game. */
  lang: Lang;
  onLanguage: (lang: Lang) => void;
}

const TRAY_KEY = 'thefall.trayCollapsed';

/**
 * A running game. Owns the GameState via a reducer and passes read-only state plus
 * `dispatch` down. No game rules live here. Selection, dialogs, navigation and map
 * targeting are UI state, kept outside GameState.
 */
export function App({ initialState, onExit, onLoad, onLanguage }: AppProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [selectedId, setSelectedId] = useState<ProvinceId | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [nav, dispatchNav] = useNavigation();
  const [targeting, setTargeting] = useState<Targeting | null>(null);
  const [picked, setPicked] = useState<ProvinceId | null>(null);
  const [trayCollapsed, setTrayCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(TRAY_KEY) === '1';
    } catch {
      return false;
    }
  });
  const close = () => setDialog({ kind: 'none' });

  const selected = selectedId ? state.provinces[selectedId] : undefined;

  const cancelTargeting = () => {
    setTargeting(null);
    setPicked(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (targeting) cancelTargeting();
      else setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [targeting]);

  useEffect(() => {
    try {
      sessionStorage.setItem(TRAY_KEY, trayCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [trayCollapsed]);

  // Autosave at the start of every year and whenever the campaign ends.
  useEffect(() => {
    saveGame(state, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.year, state.status]);

  // A new year or a finished campaign invalidates any pending map targeting.
  useEffect(() => {
    cancelTargeting();
  }, [state.year, state.status]);

  const endYear = () => {
    playSound('bell');
    dispatch({ type: 'END_YEAR' });
    setDialog({ kind: 'year_report' });
  };

  /** Show the report of the battle that the last action produced. */
  const showBattle = () => setDialog({ kind: 'battle', battleCount: state.battles.length });
  const openAttack = (provinceId: ProvinceId) => setDialog({ kind: 'attack', provinceId });
  const newBattle = dialog.kind === 'battle' && state.battles.length > dialog.battleCount ? state.battles.at(-1) : undefined;

  const startTargeting = (t: Targeting) => {
    setTargeting(t);
    // A province already selected on the map is pre-picked if it is a valid target.
    setPicked(selectedId && t.validIds.includes(selectedId) ? selectedId : null);
  };

  /** Map clicks select provinces, or pick the target of a pending operation. */
  const onMapSelect = (id: ProvinceId | null) => {
    if (targeting) {
      if (id && targeting.validIds.includes(id)) setPicked(id);
      return;
    }
    setSelectedId(id);
    if (id && nav.mode === 'expanded') dispatchNav({ type: 'OPEN_SECTION', id: 'provinces' });
  };

  const confirmTarget = () => {
    if (!targeting || !picked) return;
    const t = targeting;
    const id = picked;
    cancelTargeting();
    setSelectedId(id);
    t.confirm(id);
  };

  const openSection = (id: NavSectionId) => dispatchNav({ type: 'OPEN_SECTION', id });

  let modal: JSX.Element | null = null;
  const pendingEvent = state.status === 'ongoing' ? state.activeEvents[0] : undefined;
  if (dialog.kind === 'menu') modal = <GameMenu state={state} onClose={close} onLoad={onLoad} onExit={onExit} onLanguage={onLanguage} />;
  else if (state.status === 'defeat') modal = <DefeatModal state={state} onNewCampaign={onExit} />;
  else if (state.pendingTriumph)
    modal = <TriumphModal state={state} onContinue={() => dispatch({ type: 'ACK_TRIUMPH' })} onExit={onExit} />;
  else if (dialog.kind === 'year_report' && state.lastYearReport) modal = <YearReportModal state={state} onClose={close} />;
  else if (pendingEvent) modal = <EventModal key={pendingEvent.instanceId} state={state} event={pendingEvent} dispatch={dispatch} />;
  else if (dialog.kind === 'attack')
    modal = (
      <AttackDialog state={state} provinceId={dialog.provinceId} dispatch={dispatch} onClose={close} onResolved={showBattle} />
    );
  else if (newBattle) modal = <BattleReportModal state={state} report={newBattle} onClose={close} />;

  const ongoing = state.status === 'ongoing';
  const me = state.playerKingdomId;
  const wars = state.relations.filter((r) => (r.kingdomA === me || r.kingdomB === me) && r.stance === 'war').length;
  const besieged = state.sieges.filter((s) => state.provinces[s.provinceId]?.ownerId === me).length;

  return (
    <div className="game" data-nav={nav.mode} data-tray={trayCollapsed ? 'collapsed' : 'open'}>
      <TopBar state={state} />
      <main className="game__main">
        <NavRail
          nav={nav}
          dispatchNav={dispatchNav}
          badges={{
            ...(state.activeEvents.length > 0 ? { events: { text: `${state.activeEvents.length}`, tone: 'bad' as const } } : {}),
            ...(wars > 0 ? { diplomacy: { text: `${wars}`, tone: 'bad' as const } } : {}),
            ...(besieged > 0 ? { military: { text: '!', tone: 'bad' as const } } : {}),
          }}
        />
        <NavPanel
          state={state}
          dispatch={dispatch}
          section={nav.activeSection}
          open={nav.mode === 'expanded'}
          dispatchNav={dispatchNav}
          selected={selected}
          onSelect={(id) => setSelectedId(id)}
          onAttack={openAttack}
          onBattle={showBattle}
          startTargeting={startTargeting}
        />
        <section className={`game__map ${targeting ? 'game__map--targeting' : ''}`} aria-label={tr('Kingdom map')}>
          {nav.mode === 'mapFocus' && <MapFocusRestore dispatchNav={dispatchNav} />}
          {targeting && (
            <TargetBar state={state} targeting={targeting} picked={picked} onConfirm={confirmTarget} onCancel={cancelTargeting} />
          )}
          <MapPanel
            state={state}
            selectedId={targeting ? picked : selected ? selected.id : null}
            onSelect={onMapSelect}
            targetIds={targeting ? targeting.validIds : null}
          />
        </section>
        <StatusRail state={state} selected={selected} onOpen={openSection} />
      </main>
      <footer className="game__bottom">
        <CardTray
          state={state}
          dispatch={dispatch}
          selectedProvinceId={selected ? selected.id : null}
          collapsed={trayCollapsed}
          onToggle={() => setTrayCollapsed((c) => !c)}
        />
        <ActionBar
          canEndYear={ongoing && state.activeEvents.length === 0}
          endYearHint={tr(
            !ongoing
              ? 'The campaign is over'
              : state.activeEvents.length > 0
                ? 'Answer the pending events first'
                : `Close the year ${state.year} and begin ${state.year + 1}`,
          )}
          onEndYear={endYear}
          onMenu={() => setDialog({ kind: 'menu' })}
        />
      </footer>
      <Toasts state={state} />
      {modal}
    </div>
  );
}
