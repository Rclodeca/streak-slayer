// The Gold Pouch, a service (docs/ideas/2026-11-13-shop-economy.md §3): gems for
// gold at a poor rate, once a day, for this run: the pouch's day lives on
// Character, so a death resets it. Gems live on the account, so every rule
// takes the balance and returns what to spend; composables/useVault.ts runs
// them against the stores.

import { GOLD_POUCH, pouchGold } from './constants/economy';
import { characterGold } from './gold';
import { standing } from './shop';
import type { Character } from './types';

/** The Gold Pouch's row on `dayKey`: its gem price, the gold it pays, and whether it can be bought or was bought today. */
export function pouchState(
  character: Character,
  gems: number,
  bossIndex: number,
  dayKey: string,
): { gems: number; gold: number; status: 'buy' | 'short' | 'cooldown' } {
  const row = { gems: GOLD_POUCH.gems, gold: pouchGold(bossIndex, character.prestige ?? 0) };
  if (character.pouchDayKey === dayKey) return { ...row, status: 'cooldown' };
  return { ...row, status: gems >= GOLD_POUCH.gems ? 'buy' : 'short' };
}

/** Buys the Gold Pouch: adds its gold and marks today. The caller spends `gemsSpent`. Null unless its row reads `buy`. */
export function buyPouch(
  character: Character,
  gems: number,
  bossIndex: number,
  dayKey: string,
): { character: Character; gold: number; gemsSpent: number } | null {
  const state = pouchState(character, gems, bossIndex, dayKey);
  if (state.status !== 'buy' || !standing(character)) return null;
  return {
    character: { ...character, gold: characterGold(character) + state.gold, pouchDayKey: dayKey },
    gold: state.gold,
    gemsSpent: state.gems,
  };
}
