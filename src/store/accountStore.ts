// Thin Pinia wrapper around the account slice (gems, highest level, skins, prestige), which
// outlives every run. Saved inside the main save (see plugins/saveState.ts).

import { defineStore } from 'pinia';
import { addGems, buySkin, claimPurse, createAccount, MAX_PRESTIGE, prestigeAccount, recordLevel, settlePerfectWeek, spendGems, wearSkin } from '../game-engine';
import type { Account, Habit, MissSpan, SkinDef, SkinSlot } from '../game-engine';

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

    /** Settles the perfect week on a rollover in `nowWeekKey` (see settlePerfectWeek); returns the gems paid. */
    settlePerfectWeek(nowWeekKey: string, misses: MissSpan[], habits: Habit[]): number {
      const { account, gemsPaid } = settlePerfectWeek(this.account, nowWeekKey, misses, habits);
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

    /** Takes the next prestige rank: its gems and its special (see prestigeAccount). No-op past V. */
    prestige() {
      const next = prestigeAccount(this.account);
      if (next !== this.account) this.account = next;
    },

    /** Buys a skin and wears it; the skin, or null (nothing spent) if it can't be bought. */
    buySkin(skinId: string): SkinDef | null {
      const result = buySkin(this.account, skinId);
      if (!result) return null;
      this.account = result.account;
      return result.skin;
    },

    /** Marks the daily purse claimed on `dayKey`; false (nothing marked) if it already was. */
    claimPurse(dayKey: string): boolean {
      const claimed = claimPurse(this.account, dayKey);
      if (!claimed) return false;
      this.account = claimed;
      return true;
    },

    /** Sets the prestige rank (for now only the testing button; prestiging itself comes later). */
    setPrestige(rank: number) {
      this.account = { ...this.account, prestige: Math.max(0, Math.min(MAX_PRESTIGE, rank)) };
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
