// Testing-only overrides for the fight stage's backdrop and the phone's Hero
// tab's, from the debug menu's buttons, to try the other backdrops in place.
// Null (the first stop) draws the worn skin (composables/useSkins.ts). The
// desktop stage does not fit the arena yet.
// Not persisted: it resets on reload.

import { defineStore } from 'pinia';

// The generated arenas, public/sprites/stage/<name>.png (docs/pixellab-runs.md).
const ARENAS = ['arena', 'arena2', 'arena3', 'arena4', 'arena5', 'arena6', 'arena6b', 'arena7', 'arena7b', 'arena8', 'arena9'] as const;
export type ArenaBackdrop = (typeof ARENAS)[number];
export type StageBackdrop = 'painted' | ArenaBackdrop;
export type HomeBackdrop = 'armory' | ArenaBackdrop;

const STAGE_BACKDROPS: (StageBackdrop | null)[] = [null, 'painted', ...ARENAS];
const HOME_BACKDROPS: (HomeBackdrop | null)[] = [null, 'armory', ...ARENAS];

const next = <T>(list: T[], current: T) => list[(list.indexOf(current) + 1) % list.length];

export const useDebugBackdropStore = defineStore('debugBackdrop', {
  state: () => ({ stage: null as StageBackdrop | null, home: null as HomeBackdrop | null }),
  actions: {
    toggleStage() {
      this.stage = next(STAGE_BACKDROPS, this.stage);
    },
    toggleHome() {
      this.home = next(HOME_BACKDROPS, this.home);
    },
  },
});
