// Focus mode preference: the pinned fight stage shrinks to a slim strip, so
// the lists get the room. A UI setting, not game state: like themeStore it has
// its own localStorage key, so it survives death resets and SaveState bumps.
// It only changes the phone stage; the desktop banner ignores it.

import { defineStore } from 'pinia';

export const STORAGE_KEY = 'streak-slayer:focus-mode:v1';

function loadFocusMode(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'on';
}

export const useFocusModeStore = defineStore('focusMode', {
  state: () => ({ on: loadFocusMode() }),
  actions: {
    setOn(on: boolean) {
      this.on = on;
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    },
  },
});
