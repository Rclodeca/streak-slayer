// Thin Pinia wrapper around the account slice (gems, highest level, skins), which
// outlives every run. Saved inside the main save (see plugins/saveState.ts).

import { defineStore } from 'pinia';
import { addGems, buySkin, createAccount, recordLevel, spendGems, wearSkin } from '../game-engine';
import type { Account, SkinDef, SkinSlot } from '../game-engine';

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

    /** Buys a skin and wears it; the skin, or null (nothing spent) if it can't be bought. */
    buySkin(skinId: string): SkinDef | null {
      const result = buySkin(this.account, skinId);
      if (!result) return null;
      this.account = result.account;
      return result.skin;
    },

    /** Wears an owned skin in `slot`, or the default with null; false if it isn't owned or doesn't fit the slot. */
    wearSkin(slot: SkinSlot, skinId: string | null): boolean {
      const worn = wearSkin(this.account, slot, skinId);
      if (!worn) return false;
      this.account = worn;
      return true;
    },
  },
});
