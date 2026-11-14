// What the player keeps across every run: gems and the highest level ever
// reached. Death resets the Character but never this. Pure rules only; the
// store layer (store/accountStore.ts) saves it.

import { LEVEL_GEM_MILESTONES } from './constants/economy';

export interface Account {
  gems: number;
  // Highest level any run ever reached, so a level milestone pays once per
  // account, not once per run.
  highestLevel: number;
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
  return { account: { gems: account.gems + gemsPaid, highestLevel: level }, gemsPaid };
}

/** The account with `gems` spent, or null if it holds too few. */
export function spendGems(account: Account, gems: number): Account | null {
  if (account.gems < gems) return null;
  return { ...account, gems: account.gems - gems };
}
