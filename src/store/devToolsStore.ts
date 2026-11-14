// Dev builds only: whether the testing buttons (skip a day, popup previews)
// show, behind the one Dev button at the top. Hidden until turned on. A UI
// setting, not game state: like logVisibleStore it has its own localStorage key.

import { defineStore } from 'pinia';
import { storage } from './storage';

export const STORAGE_KEY = 'streak-slayer:dev-tools:v1';

export const useDevToolsStore = defineStore('devTools', {
  state: () => ({ on: storage.getItem(STORAGE_KEY) === 'on' }),
  actions: {
    toggle() {
      this.on = !this.on;
      storage.setItem(STORAGE_KEY, this.on ? 'on' : 'off');
    },
  },
});
