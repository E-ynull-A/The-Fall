import { tr } from '../../i18n/i18n';
import { useState } from 'react';
import type { GameState } from '../../types/game';
import { SCENARIOS } from '../../data/scenarios/scenarios';
import { listSaves, loadGame, type SlotId } from '../../services/SaveService';
import { SaveSlots } from './SaveSlots';
import { HowToPlay } from './HowToPlay';
import { LanguageSwitch } from './LanguageSwitch';
import type { Lang } from '../../i18n/i18n';

interface Props {
  onNewCampaign: () => void;
  onScenario: (id: string) => void;
  onLoad: (state: GameState) => void;
  onLanguage: (lang: Lang) => void;
}

type View = 'main' | 'scenarios' | 'load' | 'help';

export function TitleScreen({ onNewCampaign, onScenario, onLoad, onLanguage }: Props) {
  const [view, setView] = useState<View>('main');
  const [error, setError] = useState<string | null>(null);
  const saves = listSaves();
  const auto = saves[0];

  const load = (slot: SlotId) => {
    const result = loadGame(slot);
    if (result.ok) onLoad(result.state);
    else setError(result.error);
  };

  return (
    <div className="title">
      <div className="title__card">
        <div className="title__lang">
          <LanguageSwitch onChange={onLanguage} />
        </div>
        <p className="title__kicker">{tr('A game of governing a fragile kingdom')}</p>
        <h1 className="title__name">{tr('The Fall')}</h1>
        <p className="title__quote">{tr('“You cannot save everything. You can only decide what is worth saving.”')}</p>

        {view === 'main' && (
          <nav className="title__menu" aria-label={tr('Main menu')}>
            {auto && (
              <button className="btn btn--primary title__btn" onClick={() => load('auto')}>{tr(`Continue · ${auto.mode === 'scenario' ? 'Scenario' : 'Campaign'}, ${auto.year}`)}
              </button>
            )}
            <button className={`btn ${auto ? 'btn--secondary' : 'btn--primary'} title__btn`} onClick={onNewCampaign}>{tr('New Campaign')}</button>
            <button className="btn btn--secondary title__btn" onClick={() => setView('scenarios')}>{tr('Scenarios')}</button>
            <button className="btn btn--secondary title__btn" onClick={() => setView('load')}>{tr('Load Game')}</button>
            <button className="btn btn--ghost title__btn" onClick={() => setView('help')}>{tr('How to Play')}</button>
          </nav>
        )}

        {view === 'help' && (
          <div className="title__panel title__panel--help">
            <HowToPlay />
            <button className="btn btn--ghost" onClick={() => setView('main')}>{tr('Back')}</button>
          </div>
        )}

        {view === 'scenarios' && (
          <div className="title__panel">
            <ul className="scenario-list">
              {SCENARIOS.map((sc) => (
                <li key={sc.id}>
                  <button className="scenario" onClick={() => onScenario(sc.id)}>
                    <span className="scenario__name">{tr(sc.name)}</span>
                    <span className="scenario__desc">{tr(sc.description)}</span>
                    <span className="scenario__limit">{sc.yearLimit}{' '}{tr('years')}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn btn--ghost" onClick={() => setView('main')}>{tr('Back')}</button>
          </div>
        )}

        {view === 'load' && (
          <div className="title__panel">
            <SaveSlots saves={saves} onLoad={load} />
            <button className="btn btn--ghost" onClick={() => setView('main')}>{tr('Back')}</button>
          </div>
        )}
        {error && <p className="title__error">{tr(error)}</p>}
      </div>
    </div>
  );
}
