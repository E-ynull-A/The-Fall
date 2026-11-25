import { tr } from '../../i18n/i18n';
import { useEffect } from 'react';
import { playSound } from '../../services/AudioService';
import type { GameState } from '../../types/game';
import { getObjectiveDefinition } from '../../engine/ObjectiveManager';
import { Modal } from '../common/Modal';

interface Props {
  state: GameState;
  onContinue: () => void;
  onExit: () => void;
}

/** Shown when the primary objective is fulfilled, or when the campaign is won outright. */
export function TriumphModal({ state, onContinue, onExit }: Props) {
  const id = state.pendingTriumph;
  useEffect(() => playSound('victory'), []);
  const def = id ? getObjectiveDefinition(id) : null;
  const final = state.status === 'victory';
  const years = state.year - state.startYear + 1;

  return (
    <Modal
      title={tr(final ? 'Victory' : 'An Ambition Fulfilled')}
      subtitle={`Anno Domini ${state.year} · ${years} year${years === 1 ? '' : 's'} of rule`}
      footer={
        final ? (
          <>
            <button className="btn btn--ghost-dark" onClick={onContinue}>{tr('Look upon the realm')}</button>
            <button className="btn btn--primary" onClick={onExit}>{tr('Return to title')}</button>
          </>
        ) : (
          <button className="btn btn--primary" onClick={onContinue}>{tr('Continue the reign')}</button>
        )
      }
    >
      {def && (
        <>
          <p className="triumph__name">{tr(def.name)}</p>
          <p>{tr(def.description)}</p>
          <p className="notice">{tr('Reward:')}{' '}{tr(def.reward)}</p>
        </>
      )}
      {final ? (
        <p className="muted">{tr('The Fall was averted. Whatever comes next, this reign will be remembered.')}</p>
      ) : (
        <p className="muted">{tr('The realm still stands on uncertain ground. Choose a new ambition in the sidebar, or simply endure.')}</p>
      )}
    </Modal>
  );
}
