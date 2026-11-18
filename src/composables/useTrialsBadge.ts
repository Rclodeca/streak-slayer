import { computed } from 'vue';
import { claimableTrials } from '../game-engine';
import { useCharacterStore } from '../store/characterStore';
import { useDebugTrialsBadgeStore } from '../store/debugTrialsBadgeStore';

/**
 * What the stage's Trials button (and the menu's cog) wears: the trial sets
 * with a rung waiting to be claimed, one per Claim button (a number).
 */
export function useTrialsBadge() {
  const characterStore = useCharacterStore();
  const debug = useDebugTrialsBadgeStore();

  const claimCount = computed(() => debug.claims ?? claimableTrials(characterStore.character).length);
  // Every trial is live from the start, so none is ever "new": only the dev preview lights the pip.
  const newTrial = computed(() => debug.pip ?? false);
  return { claimCount, newTrial };
}
