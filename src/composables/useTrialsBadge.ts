import { computed } from 'vue';
import { activeChallenges, claimableChallenges } from '../game-engine';
import { useCharacterStore } from '../store/characterStore';
import { useDebugTrialsBadgeStore } from '../store/debugTrialsBadgeStore';
import { useTabStore } from '../store/tabStore';
import { useTrialSeenStore } from '../store/trialSeenStore';

/**
 * What the Trials tab and the stage's Trials button wear: the finished trials
 * waiting to be claimed (a number), or else a pip while a new trial waits
 * unseen (a claim outranks a new trial).
 */
export function useTrialsBadge() {
  const characterStore = useCharacterStore();
  const tabStore = useTabStore();
  const trialSeen = useTrialSeenStore();
  const debug = useDebugTrialsBadgeStore();

  const claimCount = computed(() => debug.claims ?? claimableChallenges(characterStore.character).length);
  const newTrial = computed(() => debug.pip ?? (tabStore.tab !== 'trials' && trialSeen.unseen(activeChallenges(characterStore.character))));
  return { claimCount, newTrial };
}
