import { computed } from 'vue';
import { claimableChallenges } from '../game-engine';
import { useCharacterStore } from '../store/characterStore';
import { useDebugTrialsBadgeStore } from '../store/debugTrialsBadgeStore';

/**
 * What the Trials tab and the stage's Trials button wear: the finished trials
 * waiting to be claimed (a number).
 */
export function useTrialsBadge() {
  const characterStore = useCharacterStore();
  const debug = useDebugTrialsBadgeStore();

  const claimCount = computed(() => debug.claims ?? claimableChallenges(characterStore.character).length);
  // Every trial is live from the start, so none is ever "new": only the dev preview lights the pip.
  const newTrial = computed(() => debug.pip ?? false);
  return { claimCount, newTrial };
}
