// The phone's bottom tabs (TabBar): which one is showing. Not remembered: the
// app always opens on Skills. Wider screens show every list at once and
// ignore it.

import { defineStore } from 'pinia';

export type TabId = 'skills' | 'quests' | 'trials' | 'talents' | 'hero';

/** The stage drops to the Focus strip on the Hero tab, so the hero isn't shown twice over its long page, and on Talents, to leave the tree room. */
export const STRIP_TABS: readonly TabId[] = ['talents', 'hero'];

export const useTabStore = defineStore('tab', {
  state: () => ({ tab: 'skills' as TabId }),
  actions: {
    select(tab: TabId) {
      this.tab = tab;
    },
  },
});
