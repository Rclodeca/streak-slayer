import { describe, expect, it } from 'vitest';
import type { Account } from './account';
import { createAccount } from './account';
import { createHabit } from './habits';
import { missWeekKey, settlePerfectWeek } from './perfectWeek';
import { createRng } from './rng';
import type { Habit } from './types';

const good = (lastCompletedPeriodKey: string | null, overrides: Partial<Habit> = {}): Habit => ({
  ...createHabit('Read', 'daily', 'easy', false, createRng(1)),
  lastCompletedPeriodKey,
  ...overrides,
});
const checked = [good('2026-11-21')]; // a Saturday, in W47
const miss = (from: string, to = from) => ({ from, to });
const watching = (weekKey = '2026-W47', spoiled = false): Account => ({ ...createAccount(), gems: 10, perfectWeek: { weekKey, spoiled } });

describe('settlePerfectWeek', () => {
  it('starts watching on a first rollover, paying nothing', () => {
    const { account, gemsPaid } = settlePerfectWeek(createAccount(), '2026-W47', [], checked);
    expect(gemsPaid).toBe(0);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W47', spoiled: false });
  });

  it('pays 2 gems at the turn after a week with no miss and a skill checked', () => {
    const { account, gemsPaid } = settlePerfectWeek(watching(), '2026-W48', [], checked);
    expect(gemsPaid).toBe(2);
    expect(account.gems).toBe(12);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W48', spoiled: false });
  });

  it('pays once', () => {
    const once = settlePerfectWeek(watching(), '2026-W48', [], checked).account;
    expect(settlePerfectWeek(once, '2026-W48', [], checked).gemsPaid).toBe(0);
  });

  it('a miss during the week spoils it', () => {
    const missed = settlePerfectWeek(watching(), '2026-W47', [miss('2026-W47')], checked).account;
    expect(missed.perfectWeek).toEqual({ weekKey: '2026-W47', spoiled: true });
    expect(settlePerfectWeek(missed, '2026-W48', [], checked).gemsPaid).toBe(0);
  });

  it('a Sunday miss found on Monday spoils the week that ended', () => {
    const { account, gemsPaid } = settlePerfectWeek(watching(), '2026-W48', [miss('2026-W47')], checked);
    expect(gemsPaid).toBe(0);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W48', spoiled: false });
  });

  it('a miss found after a gap across the turn spoils the watched week', () => {
    const { account, gemsPaid } = settlePerfectWeek(watching(), '2026-W48', [miss('2026-W47', '2026-W48')], checked);
    expect(gemsPaid).toBe(0);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W48', spoiled: true });
  });

  it('a miss that can only be in the new week leaves the watched week paid', () => {
    const { account, gemsPaid } = settlePerfectWeek(watching(), '2026-W48', [miss('2026-W48')], checked);
    expect(gemsPaid).toBe(2);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W48', spoiled: true });
  });

  it('a miss found again from an earlier week leaves the current one alone', () => {
    const { account } = settlePerfectWeek(watching('2026-W48'), '2026-W48', [miss('2026-W47')], checked);
    expect(account.perfectWeek).toEqual({ weekKey: '2026-W48', spoiled: false });
  });

  it('pays nothing for a week with no good skill checked', () => {
    expect(settlePerfectWeek(watching(), '2026-W48', [], []).gemsPaid).toBe(0);
    const badOnly = [good('2026-11-21', { isBad: true })];
    expect(settlePerfectWeek(watching(), '2026-W48', [], badOnly).gemsPaid).toBe(0);
    expect(settlePerfectWeek(watching(), '2026-W48', [], [good('2026-11-14')]).gemsPaid).toBe(0);
  });

  it('a weekly checked in the week counts', () => {
    const weekly = good('2026-W47', { period: 'weekly' });
    expect(settlePerfectWeek(watching(), '2026-W48', [], [weekly]).gemsPaid).toBe(2);
  });
});

describe('missWeekKey', () => {
  it("gives a weekly's key as is and a daily's day key's week", () => {
    expect(missWeekKey(good(null, { period: 'weekly' }), '2026-W47')).toBe('2026-W47');
    expect(missWeekKey(good(null), '2026-11-22')).toBe('2026-W47');
    expect(missWeekKey(good(null), '2026-11-23')).toBe('2026-W48');
  });
});
