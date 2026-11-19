// A finished task or claimed challenge, told in the foot-of-screen note
// (useToast) rather than a popup: it asks nothing of the player, so it goes
// on its own. Purely presentational; completeQuest/claimTrial already paid the EXP.

import { formatCompact } from '../game-engine';
import { useToast } from './useToast';

export function useQuestDone() {
  const toast = useToast();

  function showQuestDone(done: { description: string; amount: number }): void {
    toast.show({ icon: 'exp', title: done.description, text: `+${formatCompact(done.amount)} EXP`, tone: 'var(--icon-exp)' });
  }

  return { showQuestDone };
}
