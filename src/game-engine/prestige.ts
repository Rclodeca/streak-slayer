// Prestige: how many times the account has started over by choice, I to V.
// Each rank has a title and an item rarity's colour (docs/mockups/hero-prestige-4.html):
// Veteran in rare blue (I-II), Ascendant in epic purple (III-IV), Mythic in relic
// orange (V). The title marks the tier, the numeral the exact rank.

import type { Account } from './account';
import type { ItemRarity } from './items';

export const MAX_PRESTIGE = 5;

export interface PrestigeMark {
  rank: number;
  numeral: string;
  title: string;
  rarity: ItemRarity;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

/** The account's prestige rank, 0 (never) to MAX_PRESTIGE. Missing on saves from before prestige. */
export function prestigeRank(account: Account): number {
  return Math.max(0, Math.min(MAX_PRESTIGE, Math.floor(account.prestige ?? 0)));
}

/** The title, numeral and colour for `rank`, or null for a hero who has never prestiged. */
export function prestigeMark(rank: number): PrestigeMark | null {
  if (rank < 1) return null;
  const r = Math.min(MAX_PRESTIGE, rank);
  if (r <= 2) return { rank: r, numeral: NUMERALS[r - 1], title: 'Veteran', rarity: 'rare' };
  if (r <= 4) return { rank: r, numeral: NUMERALS[r - 1], title: 'Ascendant', rarity: 'epic' };
  return { rank: r, numeral: NUMERALS[r - 1], title: 'Mythic', rarity: 'relic' };
}
