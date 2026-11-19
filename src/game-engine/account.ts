// What the player keeps across every run: gems and the highest level ever
// reached. Death resets the Character but never this. Pure rules only; the
// store layer (store/accountStore.ts) saves it.

import { LEVEL_GEM_MILESTONES, STARTING_GEMS } from './constants/economy';
import { expCurveLevel } from './leveling';
import type { SkinSlot } from './skins';
import type { TaskGroup } from './types';

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
  // The week the perfect week is watching, and whether a missed skill already
  // spoiled it (see perfectWeek.ts). Missing until the first rollover.
  perfectWeek?: { weekKey: string; spoiled: boolean };
  // Whether STARTING_GEMS has been paid. A new account starts with it paid;
  // missing on saves from before it, which payStartingGems pays once.
  startingGemsPaid?: boolean;
  // Whether highestLevel was moved to the 2026-11-18 EXP curve (see
  // applyExpCurveToAccount). A new account starts with it set.
  expCurveApplied?: boolean;
  // The player's names for the task group slots (see taskGroups.ts). Only
  // renamed slots are kept; missing = every slot has its default name.
  taskGroupNames?: Partial<Record<TaskGroup, string>>;
}

export function createAccount(): Account {
  return { gems: STARTING_GEMS, highestLevel: 1, startingGemsPaid: true, expCurveApplied: true };
}

/** Moves the account's best level to the 2026-11-18 EXP curve, once, as applyExpCurve moves a run's, so no milestone pays again for a level the move skipped over. */
export function applyExpCurveToAccount(account: Account): Account {
  if (account.expCurveApplied) return account;
  return { ...account, highestLevel: expCurveLevel(account.highestLevel), expCurveApplied: true };
}

/** Pays STARTING_GEMS, once, to an account from before them. The same account back once paid. */
export function payStartingGems(account: Account): Account {
  if (account.startingGemsPaid) return account;
  return { ...account, gems: account.gems + STARTING_GEMS, startingGemsPaid: true };
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
