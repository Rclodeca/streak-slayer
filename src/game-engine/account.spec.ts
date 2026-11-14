import { describe, expect, it } from 'vitest';
import { buyFreeze, createAccount, freezeCost, frozenDays, pruneFrozenDays, recordLevel, spendGems } from './account';
import type { Account } from './account';

describe('recordLevel', () => {
  it('pays the milestones up to the level reached', () => {
    const { account, gemsPaid } = recordLevel(createAccount(), 10);
    expect(gemsPaid).toBe(2 + 3);
    expect(account.highestLevel).toBe(10);
    expect(account.gems).toBe(2 + 3);
  });

  it('a milestone pays once', () => {
    const first = recordLevel(createAccount(), 10).account;
    const afterDeath = recordLevel(first, 4);
    expect(afterDeath.gemsPaid).toBe(0);
    expect(afterDeath.account.highestLevel).toBe(10);
    expect(recordLevel(afterDeath.account, 10).gemsPaid).toBe(0);
  });

  it('jumping several milestones pays all of them', () => {
    expect(recordLevel(createAccount(), 16).gemsPaid).toBe(2 + 3 + 4);
  });
});

describe('spendGems', () => {
  it('spends nothing when short', () => {
    expect(spendGems({ gems: 2, highestLevel: 5 }, 3)).toBeNull();
  });

  it('can spend down to exactly 0', () => {
    expect(spendGems({ gems: 3, highestLevel: 5 }, 3)).toEqual({ gems: 0, highestLevel: 5 });
  });
});

describe('the streak freeze', () => {
  const TODAY = '2026-11-14';
  const rich = (frozenDayKeys?: string[]): Account => ({ gems: 99, highestLevel: 1, ...(frozenDayKeys && { frozenDayKeys }) });

  it('freezes days from tomorrow at 2 gems a day', () => {
    const result = buyFreeze({ gems: 6, highestLevel: 1 }, TODAY, '2026-11-15', 3)!;
    expect(result.gemsSpent).toBe(6);
    expect(result.account.gems).toBe(0);
    expect(frozenDays(result.account)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
  });

  it('must be set up in advance: never today or before', () => {
    expect(buyFreeze(rich(), TODAY, TODAY, 1)).toBeNull();
    expect(buyFreeze(rich(), TODAY, '2026-11-13', 2)).toBeNull();
  });

  it('starts no more than 30 days out', () => {
    expect(buyFreeze(rich(), TODAY, '2026-12-14', 1)).not.toBeNull();
    expect(buyFreeze(rich(), TODAY, '2026-12-15', 1)).toBeNull();
  });

  it('covers 1 to 7 days a buy', () => {
    expect(buyFreeze(rich(), TODAY, '2026-11-15', 0)).toBeNull();
    expect(buyFreeze(rich(), TODAY, '2026-11-15', 8)).toBeNull();
    expect(buyFreeze(rich(), TODAY, '2026-11-15', 7)).not.toBeNull();
  });

  it('charges only days not already frozen', () => {
    const account = rich(['2026-11-15', '2026-11-16']);
    expect(freezeCost(account, '2026-11-15', 3)).toBe(2);
    const result = buyFreeze(account, TODAY, '2026-11-15', 3)!;
    expect(result.gemsSpent).toBe(2);
    expect(frozenDays(result.account)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
  });

  it('buys nothing when every day is already frozen', () => {
    expect(buyFreeze(rich(['2026-11-15']), TODAY, '2026-11-15', 1)).toBeNull();
  });

  it('short on gems buys nothing', () => {
    expect(buyFreeze({ gems: 5, highestLevel: 1 }, TODAY, '2026-11-15', 3)).toBeNull();
  });

  it('keeps the days sorted when a freeze lands before one already bought', () => {
    const result = buyFreeze(rich(['2026-11-20']), TODAY, '2026-11-15', 1)!;
    expect(frozenDays(result.account)).toEqual(['2026-11-15', '2026-11-20']);
  });

  it('an account from before freezes has none', () => {
    expect(frozenDays(createAccount())).toEqual([]);
  });

  it('pruneFrozenDays drops old days and keeps yesterday', () => {
    const account = rich(['2026-10-01', '2026-11-13', '2026-11-20']);
    expect(frozenDays(pruneFrozenDays(account, TODAY))).toEqual(['2026-11-13', '2026-11-20']);
    const fresh = rich(['2026-11-13']);
    expect(pruneFrozenDays(fresh, TODAY)).toBe(fresh);
    const none = createAccount();
    expect(pruneFrozenDays(none, TODAY)).toBe(none);
  });
});
