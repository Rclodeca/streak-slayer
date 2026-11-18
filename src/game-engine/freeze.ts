// The streak freeze (docs/ideas/2026-11-13-shop-economy.md §3), bought with
// gems for one skill and set up in advance: the skill rests on the days it
// covers (see isFrozenOn in habits.ts), so they neither grow its streak nor
// break it. A daily freezes by the day from tomorrow on, a weekly by the
// whole week from next week on, so a freeze never covers a period already
// under way. Gems live on the account, so the rules take the balance and
// return what to spend.

import { FREEZE } from './constants/economy';
import { addDaysToDayKey, daysBetweenDayKeys, weekStartOf } from './time';
import type { Habit } from './types';

/** The day keys `count` periods from `fromDayKey` cover: days for a daily, whole weeks for a weekly. */
function coveredDays(habit: Habit, fromDayKey: string, count: number): string[] {
  const days = habit.period === 'weekly' ? count * 7 : count;
  return Array.from({ length: days }, (_, i) => addDaysToDayKey(fromDayKey, i));
}

/** What freezing `count` periods from `fromDayKey` costs: FREEZE.gemsPerDay for each day not already frozen, or FREEZE.gemsPerWeek for each week on a weekly. */
export function freezeCost(habit: Habit, fromDayKey: string, count: number): number {
  const frozen = habit.frozenDayKeys ?? [];
  const weekly = habit.period === 'weekly';
  const newDays = coveredDays(habit, fromDayKey, count).filter((key) => !frozen.includes(key)).length;
  return weekly ? Math.ceil(newDays / 7) * FREEZE.gemsPerWeek : newDays * FREEZE.gemsPerDay;
}

/** Whether `fromDayKey` and `count` are a freeze `habit` may take on `todayKey`: ahead of time, not too far out, not too long. */
function freezeAllowed(habit: Habit, todayKey: string, fromDayKey: string, count: number): boolean {
  if (habit.isBad) return false;
  if (habit.period === 'weekly') {
    const weeksOut = daysBetweenDayKeys(weekStartOf(todayKey), fromDayKey) / 7;
    return weekStartOf(fromDayKey) === fromDayKey && weeksOut >= 1 && weeksOut <= FREEZE.maxLeadWeeks && count >= 1 && count <= FREEZE.maxWeeks;
  }
  const lead = daysBetweenDayKeys(todayKey, fromDayKey);
  return lead >= 1 && lead <= FREEZE.maxLeadDays && count >= 1 && count <= FREEZE.maxDays;
}

/**
 * Buys a streak freeze on `habit` for `count` periods from `fromDayKey`. Null
 * for a bad habit, a start today or before (this week or before, for a
 * weekly, which must start on a Monday), a start too far out, a length out of
 * range, nothing new to freeze, or too few gems.
 */
export function buyFreeze(habit: Habit, todayKey: string, fromDayKey: string, count: number, gems: number): { habit: Habit; gemsSpent: number } | null {
  if (!freezeAllowed(habit, todayKey, fromDayKey, count)) return null;
  const gemsSpent = freezeCost(habit, fromDayKey, count);
  if (gemsSpent === 0 || gems < gemsSpent) return null;
  const frozenDayKeys = [...new Set([...(habit.frozenDayKeys ?? []), ...coveredDays(habit, fromDayKey, count)])].sort();
  return { habit: { ...habit, frozenDayKeys }, gemsSpent };
}

/** How long a used frozen day is kept: the rollover still looks back two weeks. */
const FROZEN_KEEP_DAYS = 14;

/** The habit without frozen days more than FROZEN_KEEP_DAYS before today; the same habit when none go. */
export function pruneFrozenDays(habit: Habit, todayKey: string): Habit {
  const frozen = habit.frozenDayKeys;
  if (!frozen?.length) return habit;
  const kept = frozen.filter((key) => daysBetweenDayKeys(key, todayKey) <= FROZEN_KEEP_DAYS);
  return kept.length === frozen.length ? habit : { ...habit, frozenDayKeys: kept };
}
