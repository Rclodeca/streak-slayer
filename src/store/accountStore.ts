// Thin Pinia wrapper around the account slice (gems, highest level, frozen days), which
// outlives every run. Saved inside the main save (see plugins/saveState.ts).

import { defineStore } from 'pinia';
import { addGems, buyFreeze, createAccount, pruneFrozenDays, recordLevel, spendGems } from '../game-engine';
import type { Account } from '../game-engine';

export const useAccountStore = defineStore('account', {
  state: () => ({
    account: createAccount(),
  }),
  actions: {
    /** Hydrates from a save slice. A save from before accounts starts at 0 gems and is paid, once, every milestone up to `seedLevel` (its best level so far). */
    initFromSave(saved: Account | null, seedLevel: number) {
      this.account = saved ?? recordLevel(createAccount(), seedLevel).account;
    },

    /** Pays any level milestones `level` newly reaches; returns the gems paid. */
    recordLevel(level: number): number {
      const { account, gemsPaid } = recordLevel(this.account, level);
      if (account !== this.account) this.account = account;
      return gemsPaid;
    },

    /** Adds `gems` (a claimed trial). */
    addGems(gems: number) {
      this.account = addGems(this.account, gems);
    },

    /** Spends `gems`; false (and nothing spent) when the account holds too few. */
    spendGems(gems: number): boolean {
      const spent = spendGems(this.account, gems);
      if (!spent) return false;
      this.account = spent;
      return true;
    },

    /** Buys a streak freeze (see buyFreeze in account.ts); returns the gems spent, or null with nothing spent. */
    buyFreeze(todayKey: string, fromDayKey: string, days: number): number | null {
      const result = buyFreeze(this.account, todayKey, fromDayKey, days);
      if (!result) return null;
      this.account = result.account;
      return result.gemsSpent;
    },

    /** Drops frozen days long past (see pruneFrozenDays in account.ts). */
    pruneFrozenDays(todayKey: string) {
      const pruned = pruneFrozenDays(this.account, todayKey);
      if (pruned !== this.account) this.account = pruned;
    },
  },
});
