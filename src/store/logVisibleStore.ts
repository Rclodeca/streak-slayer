// Activity log visibility preference: the log is hidden until the player turns
// it on from the menu. A UI setting, not game state: like focusModeStore it has
// its own localStorage key, so it survives death resets and SaveState bumps.

import { defineStore } from 'pinia';

export const STORAGE_KEY = 'streak-slayer:show-log:v1';

function loadLogVisible(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

export const useLogVisibleStore = defineStore('logVisible', {
  state: () => ({ on: loadLogVisible() }),
  actions: {
    setOn(on: boolean) {
      this.on = on;
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    },
  },
});
