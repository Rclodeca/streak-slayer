// Per-level stat math shared by leveling, items and boss skills. A leaf module
// (it imports no combat code) so boss skills can read max health without
// importing leveling, which imports them.

import { TUNING } from './constants/tuning';
import { itemBonusPercent, itemFlatBonus } from './items';
import type { Character } from './types';

/** A starter stat grown to `level`: health and healing at LEVEL_HEALTH_HEALING_GROWTH_RATE, the damage stats at LEVEL_STAT_GROWTH_RATE. */
export function statAtLevel(starterStatValue: number, level: number, stat: keyof Character['starterStats']): number {
  const rate = stat === 'health' || stat === 'healing' ? TUNING.LEVEL_HEALTH_HEALING_GROWTH_RATE : TUNING.LEVEL_STAT_GROWTH_RATE;
  return starterStatValue * Math.pow(1 + rate, level - 1);
}

/**
 * The character's equipped-item and talent bonus for `stat`, expressed as a
 * multiplier (e.g. 1.06 for a +6% item). The three damage stats also get any
 * `allDamage` bonus; drawbacks (negative percents) pull it below 1.
 */
export function itemStatMultiplier(
  character: Character,
  stat: 'physicalDamage' | 'magicDamage' | 'healing' | 'health' | 'trueDamage',
): number {
  const allDamage = stat === 'healing' || stat === 'health' ? 0 : itemBonusPercent(character, 'allDamage');
  return 1 + (itemBonusPercent(character, stat) + allDamage) / 100;
}

/** statAtLevel(...) scaled by the character's equipped-item bonus for `stat`. */
export function effectiveStat(
  character: Character,
  stat: 'physicalDamage' | 'magicDamage' | 'healing' | 'health' | 'trueDamage',
): number {
  const baseWithFlat = statAtLevel(character.starterStats[stat], character.level, stat) + itemFlatBonus(character, stat);
  return baseWithFlat * itemStatMultiplier(character, stat);
}
