// Which trials (the side-quest challenges) the player has seen on the phone's
// Trials tab, so a new one wears a "New" tag there and the tab a pip until it
// has been looked at. A UI setting, not game state: like hintStore it has its
// own localStorage key. A trial is known by its id and the day it was taken,
// since the same challenge can come round again in a later run.

import { defineStore } from 'pinia';
import type { ChallengeEntry } from '../game-engine';
import { storage } from './storage';

export const STORAGE_KEY = 'streak-slayer:trials-seen:v1';

export const trialKey = (entry: ChallengeEntry) => `${entry.id}@${entry.takenDayKey}`;

function loadSeen(): string[] {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export const useTrialSeenStore = defineStore('trialSeen', {
  // fresh: the ones that were new when this visit to the tab began.
  state: () => ({ seen: loadSeen(), fresh: [] as string[] }),
  getters: {
    unseen: (state) => (active: ChallengeEntry[]) => active.some((entry) => !state.seen.includes(trialKey(entry))),
  },
  actions: {
    /** On the Trials tab: the unseen ones join this visit's fresh ones, and every active one is seen. */
    visit(active: ChallengeEntry[]) {
      const keys = active.map(trialKey);
      this.fresh = [...this.fresh, ...keys.filter((key) => !this.seen.includes(key) && !this.fresh.includes(key))];
      // Only the active ones are kept: a finished trial never needs its tag again.
      this.seen = keys;
      storage.setItem(STORAGE_KEY, JSON.stringify(keys));
    },
    /** Off the Trials tab: the tags come off. */
    leave() {
      this.fresh = [];
    },
  },
});
