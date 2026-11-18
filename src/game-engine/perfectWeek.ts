// The perfect week (docs/superpowers/specs/2026-11-17-gem-economy-design.md
// §3): PERFECT_WEEK_GEMS for a calendar week in which every due daily and
// weekly skill was checked. Bad habits don't count against it, and frozen or
// rest days aren't due, so the rollover never reports them missed.
//
// The account watches one week at a time. Each rollover hands over the weeks
// its missed skills fell in. The rollover only resolves each skill's latest
// due period, so a miss found after the app sat closed may stand for any day
// since the last open: at the turn of the week, a miss in the watched week or
// later spoils it. Within a week only a miss in that week does, so one found
// again from an earlier week (its popup never acknowledged) is let be. A week
// also needs a good skill checked in it; the first rollover of a new week runs
// on open, before anything is checked, so lastCompletedPeriodKey still shows it.

import type { Account } from './account';
import { PERFECT_WEEK_GEMS } from './constants/economy';
import { weekKeyOfDayKey } from './time';
import type { Habit } from './types';

/** The week a period key of `habit`'s falls in: a weekly's key as is, a daily's day key's week. */
export function missWeekKey(habit: Habit, missedKey: string): string {
  return habit.period === 'weekly' ? missedKey : weekKeyOfDayKey(missedKey);
}

/**
 * Settles the perfect week on a rollover in week `nowWeekKey`, given the weeks
 * this rollover's missed good skills fell in: pays PERFECT_WEEK_GEMS once the
 * watched week has turned and was perfect, and moves the watch on.
 */
export function settlePerfectWeek(account: Account, nowWeekKey: string, missedWeekKeys: string[], habits: Habit[]): { account: Account; gemsPaid: number } {
  const watch = account.perfectWeek;
  const missedNow = missedWeekKeys.includes(nowWeekKey);
  if (!watch) return { account: { ...account, perfectWeek: { weekKey: nowWeekKey, spoiled: missedNow } }, gemsPaid: 0 };
  if (watch.weekKey === nowWeekKey) {
    if (!missedNow || watch.spoiled) return { account, gemsPaid: 0 };
    return { account: { ...account, perfectWeek: { ...watch, spoiled: true } }, gemsPaid: 0 };
  }
  // Week keys (YYYY-Www) sort as text.
  const spoiled = watch.spoiled || missedWeekKeys.some((key) => key >= watch.weekKey);
  const checked = habits.some((habit) => !habit.isBad && habit.lastCompletedPeriodKey !== null && missWeekKey(habit, habit.lastCompletedPeriodKey) === watch.weekKey);
  const gemsPaid = !spoiled && checked ? PERFECT_WEEK_GEMS : 0;
  return { account: { ...account, gems: account.gems + gemsPaid, perfectWeek: { weekKey: nowWeekKey, spoiled: missedNow } }, gemsPaid };
}
