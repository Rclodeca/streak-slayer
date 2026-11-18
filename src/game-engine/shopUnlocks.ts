import { UNLOCK_LEVELS } from './constants/unlocks';
import type { Character } from './types';

/** The Shop's gates: the tab itself (its Items side), then its Services and Looks sides. */
export type ShopGate = 'shop' | 'services' | 'looks';

export const SHOP_GATES: readonly ShopGate[] = ['shop', 'services', 'looks'];

const FLAG = { shop: 'shopUnlocked', services: 'servicesUnlocked', looks: 'looksUnlocked' } as const;

/** Whether `gate` is open: unlocked once (kept through death and prestige), or at its level with the level-up popup up. */
export function shopGateOpen(character: Pick<Character, 'level' | 'shopUnlocked' | 'servicesUnlocked' | 'looksUnlocked'>, gate: ShopGate): boolean {
  return character[FLAG[gate]] === true || character.level >= UNLOCK_LEVELS[gate];
}

/** Whether the level-up popup should announce `gate`: its level reached and the gate not yet opened. */
export function shopGatePending(character: Pick<Character, 'level' | 'shopUnlocked' | 'servicesUnlocked' | 'looksUnlocked'>, gate: ShopGate): boolean {
  return character[FLAG[gate]] !== true && character.level >= UNLOCK_LEVELS[gate];
}

/** Opens for good every gate the character's level has reached (the level-up popup's Onward). The same character back if none was waiting. */
export function unlockShopGates(character: Character): Character {
  const due = SHOP_GATES.filter((gate) => shopGatePending(character, gate));
  if (due.length === 0) return character;
  return { ...character, ...Object.fromEntries(due.map((gate) => [FLAG[gate], true])) };
}

/**
 * Settles the gates on a save from before them: the Shop was open from the
 * start, so every gate the hero's level (or best level, `highestLevel`) has
 * reached opens with no popup. The rest are sealed like a new hero's.
 */
export function migrateShopGates(character: Character, highestLevel: number): Character {
  if (SHOP_GATES.every((gate) => character[FLAG[gate]] !== undefined)) return character;
  const best = Math.max(character.level, highestLevel);
  return { ...character, ...Object.fromEntries(SHOP_GATES.map((gate) => [FLAG[gate], character[FLAG[gate]] ?? best >= UNLOCK_LEVELS[gate]])) };
}
