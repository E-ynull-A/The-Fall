import { tr } from '../../i18n/i18n';
import { useEffect } from 'react';
import { playSound } from '../../services/AudioService';
import type { GameState } from '../../types/game';
import { Modal } from '../common/Modal';

export function DefeatModal({ state, onNewCampaign }: { state: GameState; onNewCampaign: () => void }) {
  const years = state.year - state.startYear + 1;
  useEffect(() => playSound('defeat'), []);
  return (
    <Modal
      title={tr('The Fall of Ardenhal')}
      subtitle={`Anno Domini ${state.year} · after ${years} year${years === 1 ? '' : 's'} of rule`}
      tone="grave"
      footer={
        <button className="btn btn--primary" onClick={onNewCampaign}>{tr('Return to title')}</button>
      }
    >
      <p className="defeat__reason">{tr(state.defeatReason)}</p>
      <p className="muted">{tr('You could not save everything. This time, you could not save enough.')}</p>
    </Modal>
  );
}
