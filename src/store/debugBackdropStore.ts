// The fight stage's backdrop (the default boss arena, run 6 with 8 rows of floor added,
// arena6b in docs/pixellab-runs.md)
// and the phone's Hero tab's, with testing-only buttons to try the other
// backdrops in place. The desktop stage does not fit the arena yet.
// Not persisted: it resets on reload.

import { defineStore } from 'pinia';

// The generated arenas, public/sprites/stage/<name>.png (docs/pixellab-runs.md).
const ARENAS = ['arena', 'arena2', 'arena3', 'arena4', 'arena5', 'arena6', 'arena6b', 'arena7', 'arena7b', 'arena8', 'arena9'] as const;
export type ArenaBackdrop = (typeof ARENAS)[number];
export type StageBackdrop = 'painted' | ArenaBackdrop;
export type HomeBackdrop = 'armory' | ArenaBackdrop;

const STAGE_BACKDROPS: StageBackdrop[] = ['painted', ...ARENAS];
const HOME_BACKDROPS: HomeBackdrop[] = ['armory', ...ARENAS];

const next = <T>(list: T[], current: T) => list[(list.indexOf(current) + 1) % list.length];

export const useDebugBackdropStore = defineStore('debugBackdrop', {
  state: () => ({ stage: 'arena6b' as StageBackdrop, home: 'armory' as HomeBackdrop }),
  actions: {
    toggleStage() {
      this.stage = next(STAGE_BACKDROPS, this.stage);
    },
    toggleHome() {
      this.home = next(HOME_BACKDROPS, this.home);
    },
  },
});
