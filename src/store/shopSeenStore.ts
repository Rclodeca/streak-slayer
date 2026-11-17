// What the shop's "new" dots have been cleared for (see useShopNews): the day
// whose stock the player last saw on Items, the start of the service turn they
// last saw on Services, and whether they have opened Looks. A UI setting, not
// game state: it lives in its own localStorage key (like hintStore's) so a
// death reset or a SaveState schema bump never lights a dot again.

import { defineStore } from 'pinia';
import { storage } from './storage';

export const STORAGE_KEY = 'streak-slayer:shop-seen:v1';

interface Seen {
  itemsDay: string;
  servicesStart: string;
  looks: boolean;
}

function loadSeen(): Seen | null {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    return {
      itemsDay: typeof saved.itemsDay === 'string' ? saved.itemsDay : '',
      servicesStart: typeof saved.servicesStart === 'string' ? saved.servicesStart : '',
      looks: saved.looks === true,
    };
  } catch {
    return null;
  }
}

export const useShopSeenStore = defineStore('shopSeen', {
  state: () => ({ seen: loadSeen() ?? { itemsDay: '', servicesStart: '', looks: false } }),
  actions: {
    /**
     * Called once on load. With nothing saved yet, a save that already has
     * habits belongs to a player from before these dots, who knows Looks: it
     * starts seen. A brand-new player gets its dot, once.
     */
    settle(hasHabits: boolean) {
      if (loadSeen()) return;
      this.seen.looks = hasHabits;
      this.persist();
    },
    seeItems(dayKey: string) {
      if (this.seen.itemsDay === dayKey) return;
      this.seen.itemsDay = dayKey;
      this.persist();
    },
    seeServices(startKey: string) {
      if (this.seen.servicesStart === startKey) return;
      this.seen.servicesStart = startKey;
      this.persist();
    },
    seeLooks() {
      if (this.seen.looks) return;
      this.seen.looks = true;
      this.persist();
    },
    persist() {
      storage.setItem(STORAGE_KEY, JSON.stringify(this.seen));
    },
  },
});
