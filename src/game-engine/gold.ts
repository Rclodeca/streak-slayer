import type { Character } from './types';

/** Gold the character holds (undefined on a fresh character or an old save = 0). */
export function characterGold(character: Pick<Character, 'gold'>): number {
  return character.gold ?? 0;
}
