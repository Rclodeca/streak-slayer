import { describe, expect, it } from 'vitest';
import { assignSpecialIfEligible, assignUltIfEligible, grantLevelRewards, grantOverdrive } from './levelRewards';
import { createRng } from './rng';
import { TUNING } from './constants/tuning';
import type { Habit } from './types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-id',
    name: 'Test Habit',
    period: 'daily',
    difficulty: 'easy',
    damageType: 'physical',
    isBad: false,
    streakCount: 0,
    lastCompletedPeriodKey: null,
    lastCheckedPeriodKey: null,
    ...overrides,
  };
}

describe('assignSpecialIfEligible', () => {
  it('is a no-op below SPECIAL_LEVEL', () => {
    const habits = [makeHabit({ id: 'a', period: 'daily' })];
    const result = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL - 1, createRng(1));
    expect(result).toBe(habits);
    expect(result.some((h) => h.isSpecial)).toBe(false);
  });

  it('is a no-op when there is no eligible (daily, good) habit', () => {
    const habits = [
      makeHabit({ id: 'weekly', period: 'weekly' }),
      makeHabit({ id: 'bad-daily', period: 'daily', isBad: true }),
    ];
    const result = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL, createRng(1));
    expect(result).toBe(habits);
  });

  it('assigns isSpecial to exactly one eligible habit at or above SPECIAL_LEVEL', () => {
    const habits = [
      makeHabit({ id: 'a', period: 'daily' }),
      makeHabit({ id: 'b', period: 'daily' }),
      makeHabit({ id: 'weekly', period: 'weekly' }),
      makeHabit({ id: 'bad', period: 'daily', isBad: true }),
    ];
    const result = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL, createRng(1));
    const specials = result.filter((h) => h.isSpecial);
    expect(specials).toHaveLength(1);
    expect(['a', 'b']).toContain(specials[0].id);
  });

  it('is a no-op once a habit already has isSpecial, even if called again', () => {
    const habits = [
      makeHabit({ id: 'a', period: 'daily', isSpecial: true }),
      makeHabit({ id: 'b', period: 'daily' }),
    ];
    const result = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL, createRng(2));
    expect(result).toBe(habits);
  });

  it('retroactively assigns once an eligible habit exists, having previously been a no-op', () => {
    let habits: Habit[] = [makeHabit({ id: 'weekly-only', period: 'weekly' })];
    habits = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL, createRng(1));
    expect(habits.some((h) => h.isSpecial)).toBe(false);

    habits = [...habits, makeHabit({ id: 'newly-added-daily', period: 'daily' })];
    habits = assignSpecialIfEligible(habits, TUNING.SPECIAL_LEVEL, createRng(1));
    expect(habits.find((h) => h.id === 'newly-added-daily')?.isSpecial).toBe(true);
  });
});

describe('assignUltIfEligible', () => {
  it('is a no-op below ULT_LEVEL', () => {
    const habits = [makeHabit({ id: 'a', period: 'weekly' })];
    const result = assignUltIfEligible(habits, TUNING.ULT_LEVEL - 1, createRng(1));
    expect(result).toBe(habits);
  });

  it('assigns isUlt to an eligible (weekly, good) habit at or above ULT_LEVEL', () => {
    const habits = [
      makeHabit({ id: 'weekly-good', period: 'weekly' }),
      makeHabit({ id: 'daily-good', period: 'daily' }),
      makeHabit({ id: 'weekly-bad', period: 'weekly', isBad: true }),
    ];
    const result = assignUltIfEligible(habits, TUNING.ULT_LEVEL, createRng(1));
    const ults = result.filter((h) => h.isUlt);
    expect(ults).toHaveLength(1);
    expect(ults[0].id).toBe('weekly-good');
  });
});

describe('grantOverdrive', () => {
  it('is a no-op when there are no good habits to grant it to', () => {
    const habits = [makeHabit({ id: 'a', isBad: true })];
    const { habits: result, granted } = grantOverdrive(habits, createRng(1));
    expect(result).toBe(habits);
    expect(granted).toBeNull();
  });

  it('always grants Overdrive to a good habit and never to a bad one', () => {
    for (let seed = 0; seed < 50; seed++) {
      const habits = [makeHabit({ id: 'good', isBad: false }), makeHabit({ id: 'bad', isBad: true })];
      const { habits: result, granted } = grantOverdrive(habits, createRng(seed));
      expect(granted?.id).toBe('good');
      expect(result.find((h) => h.id === 'good')?.isOverdrive).toBe(true);
      expect(result.find((h) => h.id === 'bad')?.isOverdrive).toBeFalsy();
    }
  });

  it('is a no-op when every good habit already has Overdrive', () => {
    const habits = [makeHabit({ id: 'only-one', isOverdrive: true })];
    const { habits: result, granted } = grantOverdrive(habits, createRng(1));
    expect(result).toBe(habits);
    expect(granted).toBeNull();
  });

  it('never re-picks a habit that already has Overdrive', () => {
    for (let seed = 0; seed < 50; seed++) {
      const habits = [makeHabit({ id: 'has', isOverdrive: true }), makeHabit({ id: 'new' })];
      const { granted } = grantOverdrive(habits, createRng(seed));
      expect(granted?.id).toBe('new');
    }
  });
});

describe('grantLevelRewards', () => {
  const daily = (id = 'd') => makeHabit({ id, period: 'daily' });
  const weekly = (id = 'w') => makeHabit({ id, period: 'weekly' });

  it('is at level 3 for the Special and level 8 for the Ult', () => {
    expect(TUNING.SPECIAL_LEVEL).toBe(3);
    expect(TUNING.ULT_LEVEL).toBe(8);
  });

  it('grants nothing at level 2 and returns the same array', () => {
    const habits = [daily(), weekly()];
    const result = grantLevelRewards(habits, 2, createRng(1));
    expect(result.habits).toBe(habits);
    expect(result.special).toBeUndefined();
    expect(result.ult).toBeUndefined();
  });

  it('level 5 with a daily and a weekly grants only the Special', () => {
    const result = grantLevelRewards([daily(), weekly()], 5, createRng(1));
    expect(result.special?.id).toBe('d');
    expect(result.ult).toBeUndefined();
    expect(result.habits.find((h) => h.id === 'd')?.isSpecial).toBe(true);
    expect(result.habits.some((h) => h.isUlt)).toBe(false);
  });

  it('level 8 grants the Ult as well', () => {
    const result = grantLevelRewards([daily(), weekly()], 8, createRng(1));
    expect(result.special?.id).toBe('d');
    expect(result.ult?.id).toBe('w');
  });

  it('level 8 with only dailies grants the Special alone and leaves the Ult open', () => {
    const result = grantLevelRewards([daily()], 8, createRng(1));
    expect(result.special?.id).toBe('d');
    expect(result.ult).toBeUndefined();
  });

  it('a second call grants nothing', () => {
    const first = grantLevelRewards([daily(), weekly()], 8, createRng(1));
    const again = grantLevelRewards(first.habits, 8, createRng(2));
    expect(again.habits).toBe(first.habits);
    expect(again.special).toBeUndefined();
    expect(again.ult).toBeUndefined();
  });
});
