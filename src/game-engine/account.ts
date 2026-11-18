// What the player keeps across every run: gems and the highest level ever
// reached. Death resets the Character but never this. Pure rules only; the
// store layer (store/accountStore.ts) saves it.

import { LEVEL_GEM_MILESTONES } from './constants/economy';
import type { SkinSlot } from './skins';

export interface Account {
  gems: number;
  // Highest level any run ever reached, so a level milestone pays once per
  // account, not once per run.
  highestLevel: number;
  // Skins bought, and the one worn in each slot (a hero class, the home base,
  // the arena; see skins.ts). Missing on saves from before skins.
  ownedSkinIds?: string[];
  wornSkins?: Partial<Record<SkinSlot, string>>;
  // Prestige rank, 0 to 5 (see prestige.ts). Missing on saves from before prestige.
  prestige?: number;
  // The day the daily purse was last claimed (see claimPurse), on the account so
  // a death and a new run the same day don't pay it twice. Missing until the first.
  purseDayKey?: string;
  // Free dungeons unlocked by prestige ranks I and III (see prestigeAccount).
  // Recorded now; dungeons themselves come later. Missing = 0.
  freeDungeons?: number;
}

export function createAccount(): Account {
  return { gems: 0, highestLevel: 1 };
}

/** Pays every level milestone above the account's best up to `level`, and raises the best. A lower level (a new run) pays nothing and lowers nothing. */
export function recordLevel(account: Account, level: number): { account: Account; gemsPaid: number } {
  if (level <= account.highestLevel) return { account, gemsPaid: 0 };
  const gemsPaid = LEVEL_GEM_MILESTONES
    .filter((m) => m.level > account.highestLevel && m.level <= level)
    .reduce((sum, m) => sum + m.gems, 0);
  return { account: { ...account, gems: account.gems + gemsPaid, highestLevel: level }, gemsPaid };
}

/** The account with `gems` added. */
export function addGems(account: Account, gems: number): Account {
  return { ...account, gems: account.gems + gems };
}

/** The account with `gems` spent, or null if it holds too few. */
export function spendGems(account: Account, gems: number): Account | null {
  if (account.gems < gems) return null;
  return { ...account, gems: account.gems - gems };
}

/** Whether the daily purse is still to claim on `dayKey`. */
export function purseDue(account: Account, dayKey: string): boolean {
  return account.purseDayKey !== dayKey;
}

/** The account with the daily purse claimed on `dayKey`, or null if it already was. The caller pays the gold (purseGold). */
export function claimPurse(account: Account, dayKey: string): Account | null {
  if (!purseDue(account, dayKey)) return null;
  return { ...account, purseDayKey: dayKey };
}
