// Stage edge preference: how the fight stage meets the lists below it. Hard is a
// dark lip with a shadow; Pixel lets the scene's ground dissolve into the page in a
// dither. Both take the same room, so switching moves nothing. A UI setting, not
// game state: like focusModeStore it has its own localStorage key.

import { defineStore } from 'pinia';

export type StageEdge = 'hard' | 'pixel';

/** What the menu offers, in order. */
export const STAGE_EDGES: { id: StageEdge; label: string }[] = [
  { id: 'hard', label: 'Hard' },
  { id: 'pixel', label: 'Pixel' },
];

export const STORAGE_KEY = 'streak-slayer:stage-edge:v1';

function loadEdge(): StageEdge {
  return localStorage.getItem(STORAGE_KEY) === 'pixel' ? 'pixel' : 'hard';
}

export const useStageEdgeStore = defineStore('stageEdge', {
  state: () => ({ edge: loadEdge() }),
  actions: {
    setEdge(edge: StageEdge) {
      this.edge = edge;
      localStorage.setItem(STORAGE_KEY, edge);
    },
  },
});
