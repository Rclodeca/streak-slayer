// The perfect week (docs/superpowers/specs/2026-11-17-gem-economy-design.md
// §3): PERFECT_WEEK_GEMS for a calendar week in which every due daily and
// weekly skill was checked. Bad habits don't count against it, and frozen or
// rest days aren't due, so the rollover never reports them missed.
//
// The account watches one week at a time. Each settle hands over a span of
// weeks per missed good skill: the weeks its miss could have fallen in. The
// rollover only resolves each skill's latest due period, so after the app sat
// closed the miss may be any due period since the skill was last done or last
// resolved (see missSpan in useDailyRollover). A span over the watched week
// spoils it; one wholly in an earlier week (found again, its popup never
// acknowledged) or a later one doesn't. A week also needs a good skill checked
// in it; it settles before anything new is checked, so lastCompletedPeriodKey
// still shows it.

import type { Account } from './account';
import { PERFECT_WEEK_GEMS } from './constants/economy';
import { weekKeyOfDayKey } from './time';
import type { Habit } from './types';

/** The week a period key of `habit`'s falls in: a weekly's key as is, a daily's day key's week. */
export function missWeekKey(habit: Habit, missedKey: string): string {
  return habit.period === 'weekly' ? missedKey : weekKeyOfDayKey(missedKey);
}

/** The weeks a missed skill's miss could have fallen in, first to last (week keys). */
export interface MissSpan {
  from: string;
  to: string;
}

// Week keys (YYYY-Www) sort as text.
const covers = (span: MissSpan, weekKey: string) => span.from <= weekKey && weekKey <= span.to;

/**
 * Settles the perfect week in week `nowWeekKey`, given the spans of the missed
 * good skills that stand (see MissSpan): pays PERFECT_WEEK_GEMS once the
 * watched week has turned and was perfect, and moves the watch on.
 */
export function settlePerfectWeek(account: Account, nowWeekKey: string, misses: MissSpan[], habits: Habit[]): { account: Account; gemsPaid: number } {
  const watch = account.perfectWeek;
  const missedNow = misses.some((span) => covers(span, nowWeekKey));
  if (!watch) return { account: { ...account, perfectWeek: { weekKey: nowWeekKey, spoiled: missedNow } }, gemsPaid: 0 };
  if (watch.weekKey === nowWeekKey) {
    if (!missedNow || watch.spoiled) return { account, gemsPaid: 0 };
    return { account: { ...account, perfectWeek: { ...watch, spoiled: true } }, gemsPaid: 0 };
  }
  const spoiled = watch.spoiled || misses.some((span) => covers(span, watch.weekKey));
  const checked = habits.some((habit) => !habit.isBad && habit.lastCompletedPeriodKey !== null && missWeekKey(habit, habit.lastCompletedPeriodKey) === watch.weekKey);
  const gemsPaid = !spoiled && checked ? PERFECT_WEEK_GEMS : 0;
  return { account: { ...account, gems: account.gems + gemsPaid, perfectWeek: { weekKey: nowWeekKey, spoiled: missedNow } }, gemsPaid };
}
