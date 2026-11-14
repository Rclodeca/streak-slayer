// The permanent habit bonuses: Special and Ult are handed out at
// SPECIAL_LEVEL and ULT_LEVEL (grantLevelRewards), Overdrive is bought in the
// Shop (services.ts). Pure functions over a habit list; Special and Ult are
// idempotent and level-gated.

import { TUNING } from './constants/tuning';
import { pickRandom, type Rng } from './rng';
import type { Habit } from './types';

/**
 * Assigns Special to a random eligible (daily, good) habit once the
 * character has reached SPECIAL_LEVEL — a no-op (returns the same array
 * reference) if a habit already has it, or if none is currently eligible.
 */
export function assignSpecialIfEligible(habits: Habit[], level: number, rng: Rng): Habit[] {
  if (level < TUNING.SPECIAL_LEVEL) return habits;
  if (habits.some((h) => h.isSpecial)) return habits;
  const eligible = habits.filter((h) => h.period === 'daily' && !h.isBad);
  if (eligible.length === 0) return habits;
  const chosen = pickRandom(eligible, rng);
  return habits.map((h) => (h.id === chosen.id ? { ...h, isSpecial: true } : h));
}

/** Ult counterpart to `assignSpecialIfEligible` — weekly good habits, ULT_LEVEL. */
export function assignUltIfEligible(habits: Habit[], level: number, rng: Rng): Habit[] {
  if (level < TUNING.ULT_LEVEL) return habits;
  if (habits.some((h) => h.isUlt)) return habits;
  const eligible = habits.filter((h) => h.period === 'weekly' && !h.isBad);
  if (eligible.length === 0) return habits;
  const chosen = pickRandom(eligible, rng);
  return habits.map((h) => (h.id === chosen.id ? { ...h, isUlt: true } : h));
}

/**
 * Hands out whatever Special and Ult the level has earned and no habit holds
 * yet: the same `habits` array back when nothing was granted, and `special` /
 * `ult` naming the habit that just got one. A level that has no habit to take
 * it leaves it open, so a later call (a new skill) can still grant it.
 */
export function grantLevelRewards(habits: Habit[], level: number, rng: Rng): { habits: Habit[]; special?: Habit; ult?: Habit } {
  const withSpecial = assignSpecialIfEligible(habits, level, rng);
  const withUlt = assignUltIfEligible(withSpecial, level, rng);
  const gained = (flag: 'isSpecial' | 'isUlt') => withUlt.find((habit) => habit[flag] && !habits.find((before) => before.id === habit.id)?.[flag]);
  return { habits: withUlt, special: gained('isSpecial'), ult: gained('isUlt') };
}

/**
 * Grants permanent Overdrive to one random good habit (either period) that
 * doesn't have it yet. Returns the same array reference and `granted: null`
 * when there is nothing to grant (no good habit, or all already have it).
 */
export function grantOverdrive(habits: Habit[], rng: Rng): { habits: Habit[]; granted: Habit | null } {
  const pool = habits.filter((h) => !h.isBad && !h.isOverdrive);
  if (pool.length === 0) return { habits, granted: null };
  const chosen = pickRandom(pool, rng);
  const granted = { ...chosen, isOverdrive: true };
  return { habits: habits.map((h) => (h.id === chosen.id ? granted : h)), granted };
}
