// Prestige: how many times the account has started over by choice, I to V.
// Each rank has a title and an item rarity's colour (docs/mockups/hero-prestige-4.html):
// Veteran in rare blue (I-II), Ascendant in epic purple (III-IV), Mythic in relic
// orange (V). The title marks the tier, the numeral the exact rank.

import type { Account } from './account';
import type { BoostableStat, ItemRarity } from './items';
import type { Character } from './types';

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

export type PrestigeSpecial = 'dungeon' | 'deeper-roots' | 'mythic-skin';

export interface PrestigeRankDef {
  rank: number;
  bar: number;
  special: PrestigeSpecial;
}

/** Rank n opens once the hero's current level reaches its bar (docs/superpowers/specs/2026-11-17-prestige-design.md §4). */
export const PRESTIGE_RANKS: readonly PrestigeRankDef[] = [
  { rank: 1, bar: 30, special: 'dungeon' },
  { rank: 2, bar: 40, special: 'deeper-roots' },
  { rank: 3, bar: 50, special: 'dungeon' },
  { rank: 4, bar: 60, special: 'deeper-roots' },
  { rank: 5, bar: 70, special: 'mythic-skin' },
];

/** What every rank adds, summed with items and talents in itemBonusPercent. */
export const PRESTIGE_BONUS_PER_RANK = { allDamage: 20, health: 10, expGain: 5 } as const;

/** The rank after `rank`, or null once the hero is Mythic. */
export function nextPrestigeRank(rank: number): PrestigeRankDef | null {
  return PRESTIGE_RANKS[Math.max(0, Math.floor(rank))] ?? null;
}

/** The % the hero's prestige rank adds to `stat`: 0 for every stat but all damage, health and EXP. */
export function prestigeBonusPercent(character: Pick<Character, 'prestige'>, stat: BoostableStat): number {
  const per = (PRESTIGE_BONUS_PER_RANK as Partial<Record<BoostableStat, number>>)[stat] ?? 0;
  return per * Math.max(0, Math.min(MAX_PRESTIGE, character.prestige ?? 0));
}

/** How many Deeper roots ranks `rank` has unlocked: one at II, two at IV. */
export function deeperRootsCount(rank: number): number {
  return PRESTIGE_RANKS.filter((r) => r.special === 'deeper-roots' && r.rank <= rank).length;
}

/** Whether the hero can take the next rank now: alive, picked, and at its bar. */
export function canPrestige(character: Character, rank: number): boolean {
  const next = nextPrestigeRank(rank);
  return next !== null && !character.heroPending && Math.round(character.currentHealth) > 0 && character.level >= next.bar;
}

/** Whether going from `fromLevel` to `toLevel` crosses the next rank's bar. */
export function prestigeOpensBetween(fromLevel: number, toLevel: number, rank: number): boolean {
  const next = nextPrestigeRank(rank);
  return next !== null && fromLevel < next.bar && toLevel >= next.bar;
}

/** The character with the account's rank copied on for the stat math; the same object when it already matches. */
export function withPrestige(character: Character, rank: number): Character {
  return (character.prestige ?? 0) === rank ? character : { ...character, prestige: rank };
}
