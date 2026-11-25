import { useState } from 'react';
import type { GameState } from '../types/game';
import { createNewCampaign } from '../engine/GameEngine';
import { TitleScreen } from '../components/menu/TitleScreen';
import { getLang, setLang, type Lang } from '../i18n/i18n';
import { App } from './App';

type Screen = { kind: 'title' } | { kind: 'game'; state: GameState; key: number };

/** Switches between the title screen and a running game, and owns the UI language. */
export function Root() {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const [lang, setLangState] = useState<Lang>(getLang());

  const changeLang = (l: Lang) => {
    setLang(l);
    setLangState(l);
  };
  const start = (state: GameState) => setScreen({ kind: 'game', state, key: Date.now() });

  if (screen.kind === 'title') {
    return (
      <TitleScreen
        key={lang}
        onNewCampaign={() => start(createNewCampaign())}
        onScenario={(scenarioId) => start(createNewCampaign({ scenarioId }))}
        onLoad={start}
        onLanguage={changeLang}
      />
    );
  }
  return (
    <App
      key={screen.key}
      lang={lang}
      initialState={screen.state}
      onExit={() => setScreen({ kind: 'title' })}
      onLoad={start}
      onLanguage={changeLang}
    />
  );
}
