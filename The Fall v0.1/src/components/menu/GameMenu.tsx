import { tr } from '../../i18n/i18n';
import { useState } from 'react';
import type { GameState } from '../../types/game';
import { deleteSave, listSaves, loadGame, saveGame, type SlotId } from '../../services/SaveService';
import { Modal } from '../common/Modal';
import { SaveSlots } from './SaveSlots';
import { HowToPlay } from './HowToPlay';
import { LanguageSwitch } from './LanguageSwitch';
import type { Lang } from '../../i18n/i18n';
import { isMuted, setMuted } from '../../services/AudioService';

interface Props {
  state: GameState;
  onClose: () => void;
  onLoad: (state: GameState) => void;
  onExit: () => void;
  onLanguage: (lang: Lang) => void;
}

/** In-game menu: save, load, leave. */
export function GameMenu({ state, onClose, onLoad, onExit, onLanguage }: Props) {
  const [saves, setSaves] = useState(() => listSaves());
  const [message, setMessage] = useState<string | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [help, setHelp] = useState(false);

  const save = (slot: SlotId) => {
    const ok = saveGame(state, slot);
    setMessage(ok ? 'The chronicle has been saved.' : 'Could not save: browser storage is unavailable or full.');
    setSaves(listSaves());
  };
  const load = (slot: SlotId) => {
    const result = loadGame(slot);
    if (result.ok) onLoad(result.state);
    else setMessage(result.error);
  };
  const remove = (slot: SlotId) => {
    deleteSave(slot);
    setSaves(listSaves());
  };

  return (
    <Modal
      title={tr('The Royal Archive')}
      subtitle={`Anno Domini ${state.year} · the game also saves itself at every End Year`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost-dark" onClick={onExit}>{tr('Return to title')}</button>
          <button className="btn btn--primary" onClick={onClose}>{tr('Resume')}</button>
        </>
      }
    >
      <div className="slots--light">
        <SaveSlots saves={saves} onSave={save} onLoad={load} onDelete={remove} />
      </div>
      {message && <p className="notice">{tr(message)}</p>}
      <div className="menu-row">
        <LanguageSwitch onChange={onLanguage} light />
      </div>
      <div className="menu-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={!muted}
            onChange={(e) => {
              setMuted(!e.target.checked);
              setMutedState(!e.target.checked);
            }}
          />{tr('Sound effects')}</label>
        <button className="btn btn--ghost-dark btn--small" onClick={() => setHelp(!help)}>
          {tr(help ? 'Hide guide' : 'How to play')}
        </button>
      </div>
      {help && <HowToPlay />}
    </Modal>
  );
}
