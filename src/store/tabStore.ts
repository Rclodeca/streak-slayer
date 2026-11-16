// The phone's bottom tabs (TabBar): which one is showing, and on the Shop tab
// which side of its Items | Services | Vault switch. Not remembered: the app
// always opens on Skills, and the Shop on Items. Wider screens show every list
// at once and ignore the tab. Trials has no bottom tab: the stage's Trials
// button and the menu open it.

import { defineStore } from 'pinia';

export type TabId = 'skills' | 'quests' | 'shop' | 'trials' | 'talents' | 'hero';
export type ShopSide = 'items' | 'services' | 'vault';

export const useTabStore = defineStore('tab', {
  state: () => ({ tab: 'skills' as TabId, shopSide: 'items' as ShopSide }),
  actions: {
    select(tab: TabId) {
      this.tab = tab;
    },
    selectShopSide(side: ShopSide) {
      this.shopSide = side;
    },
  },
});
