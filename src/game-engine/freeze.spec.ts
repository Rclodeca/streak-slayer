import { describe, expect, it } from 'vitest';
import { buyFreeze, freezeCost, pruneFrozenDays } from './freeze';
import { isDueOn, isFrozenOn } from './habits';
import type { Habit } from './types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Read',
    period: 'daily',
    difficulty: 'medium',
    isBad: false,
    damageType: 'physical',
    streakCount: 4,
    lastCompletedPeriodKey: null,
    ...overrides,
  } as Habit;
}

// Sat 2026-11-14; its week runs Mon 11-09 to Sun 11-15, the next from Mon 11-16.
const TODAY = '2026-11-14';
const weekly = (overrides: Partial<Habit> = {}) => makeHabit({ period: 'weekly', ...overrides });

describe('buyFreeze on a daily', () => {
  it('freezes days from tomorrow at 2 gems a day, on that skill only', () => {
    const result = buyFreeze(makeHabit(), TODAY, '2026-11-15', 3, 6)!;
    expect(result.gemsSpent).toBe(6);
    expect(result.habit.frozenDayKeys).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
    expect(result.habit.streakCount).toBe(4);
  });

  it('must be set up in advance: never today or before', () => {
    expect(buyFreeze(makeHabit(), TODAY, TODAY, 1, 99)).toBeNull();
    expect(buyFreeze(makeHabit(), TODAY, '2026-11-13', 2, 99)).toBeNull();
  });

  it('starts no more than 30 days out and covers 1 to 7 days', () => {
    expect(buyFreeze(makeHabit(), TODAY, '2026-12-14', 1, 99)).not.toBeNull();
    expect(buyFreeze(makeHabit(), TODAY, '2026-12-15', 1, 99)).toBeNull();
    expect(buyFreeze(makeHabit(), TODAY, '2026-11-15', 0, 99)).toBeNull();
    expect(buyFreeze(makeHabit(), TODAY, '2026-11-15', 8, 99)).toBeNull();
  });

  it('charges only days not already frozen, and keeps them sorted', () => {
    const habit = makeHabit({ frozenDayKeys: ['2026-11-16', '2026-11-20'] });
    expect(freezeCost(habit, '2026-11-15', 3)).toBe(4);
    expect(buyFreeze(habit, TODAY, '2026-11-15', 3, 99)!.habit.frozenDayKeys).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-20']);
  });

  it('buys nothing when every day is frozen already, or short on gems', () => {
    expect(buyFreeze(makeHabit({ frozenDayKeys: ['2026-11-15'] }), TODAY, '2026-11-15', 1, 99)).toBeNull();
    expect(buyFreeze(makeHabit(), TODAY, '2026-11-15', 3, 5)).toBeNull();
  });

  it('never freezes a bad habit', () => {
    expect(buyFreeze(makeHabit({ isBad: true }), TODAY, '2026-11-15', 1, 99)).toBeNull();
  });
});

describe('buyFreeze on a weekly', () => {
  it('freezes whole weeks from next week at 5 gems a week', () => {
    expect(buyFreeze(weekly(), TODAY, '2026-11-16', 2, 9)).toBeNull();
    const result = buyFreeze(weekly(), TODAY, '2026-11-16', 2, 10)!;
    expect(result.gemsSpent).toBe(10);
    expect(result.habit.frozenDayKeys).toHaveLength(14);
    expect(result.habit.frozenDayKeys![0]).toBe('2026-11-16');
    expect(result.habit.frozenDayKeys![13]).toBe('2026-11-29');
  });

  it('never freezes the week under way, and starts on a Monday', () => {
    expect(buyFreeze(weekly(), TODAY, '2026-11-09', 1, 99)).toBeNull();
    expect(buyFreeze(weekly(), TODAY, '2026-11-17', 1, 99)).toBeNull();
  });

  it('starts no more than 4 weeks out and covers 1 to 4 weeks', () => {
    expect(buyFreeze(weekly(), TODAY, '2026-12-07', 1, 99)).not.toBeNull();
    expect(buyFreeze(weekly(), TODAY, '2026-12-14', 1, 99)).toBeNull();
    expect(buyFreeze(weekly(), TODAY, '2026-11-16', 5, 99)).toBeNull();
  });

  it('charges only weeks not already frozen', () => {
    const once = buyFreeze(weekly(), TODAY, '2026-11-23', 1, 99)!.habit;
    expect(freezeCost(once, '2026-11-16', 2)).toBe(5);
  });
});

describe('isFrozenOn and isDueOn', () => {
  // Wed 2026-11-18 midday Pacific.
  const wed = new Date(Date.UTC(2026, 10, 18, 20));

  it('rests a frozen daily on its frozen day only', () => {
    const habit = makeHabit({ frozenDayKeys: ['2026-11-18'] });
    expect(isFrozenOn(habit, wed)).toBe(true);
    expect(isDueOn(habit, wed)).toBe(false);
    expect(isDueOn(habit, new Date(Date.UTC(2026, 10, 19, 20)))).toBe(true);
  });

  it('leaves every other skill due', () => {
    expect(isDueOn(makeHabit({ id: 'other' }), wed)).toBe(true);
  });

  it('rests a weekly for a frozen week', () => {
    const habit = buyFreeze(weekly(), TODAY, '2026-11-16', 1, 99)!.habit;
    expect(isFrozenOn(habit, wed)).toBe(true);
    expect(isDueOn(habit, wed)).toBe(false);
    expect(isDueOn(habit, new Date(Date.UTC(2026, 10, 25, 20)))).toBe(true);
  });

  it('a frozen set-day habit is frozen, not resting', () => {
    const habit = makeHabit({ days: [2], frozenDayKeys: ['2026-11-18'] });
    expect(isFrozenOn(habit, wed)).toBe(true);
  });
});

describe('pruneFrozenDays', () => {
  it('drops days long past and keeps the last two weeks', () => {
    const habit = makeHabit({ frozenDayKeys: ['2026-10-01', '2026-11-13', '2026-11-20'] });
    expect(pruneFrozenDays(habit, TODAY).frozenDayKeys).toEqual(['2026-11-13', '2026-11-20']);
    const fresh = makeHabit({ frozenDayKeys: ['2026-11-13'] });
    expect(pruneFrozenDays(fresh, TODAY)).toBe(fresh);
    const none = makeHabit();
    expect(pruneFrozenDays(none, TODAY)).toBe(none);
  });
});
