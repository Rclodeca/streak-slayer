// What the player keeps across every run: gems and the highest level ever
// reached. Death resets the Character but never this. Pure rules only; the
// store layer (store/accountStore.ts) saves it.

import { FREEZE, LEVEL_GEM_MILESTONES } from './constants/economy';
import { addDaysToDayKey, daysBetweenDayKeys } from './time';

export interface Account {
  gems: number;
  // Highest level any run ever reached, so a level milestone pays once per
  // account, not once per run.
  highestLevel: number;
  // Days a streak freeze covers (sorted day keys), bought ahead with gems. Kept
  // through death until used. Undefined on a save from before freezes.
  frozenDayKeys?: string[];
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

/** The days the account's streak freezes cover. */
export function frozenDays(account: Account): readonly string[] {
  return account.frozenDayKeys ?? [];
}

/** The `days` day keys from `fromDayKey` on. */
function dayRange(fromDayKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDaysToDayKey(fromDayKey, i));
}

/** What freezing `days` days from `fromDayKey` costs: FREEZE.gemsPerDay for each one not already frozen. */
export function freezeCost(account: Account, fromDayKey: string, days: number): number {
  const frozen = frozenDays(account);
  return dayRange(fromDayKey, days).filter((key) => !frozen.includes(key)).length * FREEZE.gemsPerDay;
}

/**
 * Buys a streak freeze for `days` days from `fromDayKey`, set up in advance:
 * it starts tomorrow at the earliest, so it never covers a day already under
 * way. Null if it starts today or before, or more than FREEZE.maxLeadDays out,
 * covers outside 1 to FREEZE.maxDays days, freezes nothing new, or the account
 * holds too few gems.
 */
export function buyFreeze(account: Account, todayKey: string, fromDayKey: string, days: number): { account: Account; gemsSpent: number } | null {
  const lead = daysBetweenDayKeys(todayKey, fromDayKey);
  if (lead < 1 || lead > FREEZE.maxLeadDays || days < 1 || days > FREEZE.maxDays) return null;
  const gemsSpent = freezeCost(account, fromDayKey, days);
  const paid = gemsSpent > 0 ? spendGems(account, gemsSpent) : null;
  if (!paid) return null;
  const frozenDayKeys = [...new Set([...frozenDays(account), ...dayRange(fromDayKey, days)])].sort();
  return { account: { ...paid, frozenDayKeys }, gemsSpent };
}

/** How long a used frozen day is kept: the rollover still reads the week behind it. */
const FROZEN_KEEP_DAYS = 14;

/** The account without frozen days more than FROZEN_KEEP_DAYS before today; the same account when none go. */
export function pruneFrozenDays(account: Account, todayKey: string): Account {
  const frozen = frozenDays(account);
  const kept = frozen.filter((key) => daysBetweenDayKeys(key, todayKey) <= FROZEN_KEEP_DAYS);
  return kept.length === frozen.length ? account : { ...account, frozenDayKeys: kept };
}
