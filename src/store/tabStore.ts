// The phone's bottom tabs (TabBar): which one is showing. Not remembered: the
// app always opens on Skills. Wider screens show every list at once and
// ignore it.

import { defineStore } from 'pinia';

export type TabId = 'skills' | 'quests' | 'trials' | 'talents' | 'hero';

export const useTabStore = defineStore('tab', {
  state: () => ({ tab: 'skills' as TabId }),
  actions: {
    select(tab: TabId) {
      this.tab = tab;
    },
  },
});
