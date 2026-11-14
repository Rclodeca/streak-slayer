// Testing-only clock override. All gameplay code that needs "now" for
// period-key math reads it from this store instead of calling `new Date()`
// directly, so a "skip to next day" debug control can move the app's
// effective clock forward without waiting on the real wall clock. Not
// wired into persistence — the offset is session-only and resets on reload.
// `dayTick` counts real day turnovers seen while the app stays open
// (useRolloverWatch bumps it): `Date.now()` isn't reactive, so a computed that
// reads the day key reads `dayTick` too, to follow the day as it turns.

import { defineStore } from 'pinia';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const useDebugClockStore = defineStore('debugClock', {
  state: () => ({ offsetMs: 0, dayTick: 0 }),
  actions: {
    /** The app's current effective time: real wall-clock time plus any debug offset. */
    now(): Date {
      return new Date(Date.now() + this.offsetMs);
    },

    /** Notes that the day key has turned over, so day-key computeds recompute. */
    noteDayChange() {
      this.dayTick += 1;
    },

    /** Advances the effective clock by exactly one day. */
    skipToNextDay() {
      this.offsetMs += MS_PER_DAY;
    },
  },
});
