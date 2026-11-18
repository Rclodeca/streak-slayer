import { describe, expect, it } from 'vitest';
import { claimPurse, createAccount, payStartingGems, purseDue, recordLevel, spendGems } from './account';
import { purseGold, STARTING_GEMS } from './constants/economy';

describe('starting gems', () => {
  it('a new account starts with them', () => {
    expect(createAccount().gems).toBe(STARTING_GEMS);
    expect(STARTING_GEMS).toBe(30);
  });

  it('an account from before them is paid them once', () => {
    const paid = payStartingGems({ gems: 7, highestLevel: 12 });
    expect(paid).toEqual({ gems: 7 + STARTING_GEMS, highestLevel: 12, startingGemsPaid: true });
    expect(payStartingGems(paid)).toBe(paid);
    const fresh = createAccount();
    expect(payStartingGems(fresh)).toBe(fresh);
  });
});

describe('recordLevel', () => {
  it('pays the milestones up to the level reached', () => {
    const { account, gemsPaid } = recordLevel(createAccount(), 10);
    expect(gemsPaid).toBe(4 + 4);
    expect(account.highestLevel).toBe(10);
    expect(account.gems).toBe(STARTING_GEMS + 4 + 4);
  });

  it('a milestone pays once', () => {
    const first = recordLevel(createAccount(), 10).account;
    const afterDeath = recordLevel(first, 4);
    expect(afterDeath.gemsPaid).toBe(0);
    expect(afterDeath.account.highestLevel).toBe(10);
    expect(recordLevel(afterDeath.account, 10).gemsPaid).toBe(0);
  });

  it('jumping several milestones pays all of them', () => {
    expect(recordLevel(createAccount(), 16).gemsPaid).toBe(4 + 4 + 4);
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

describe('the daily purse', () => {
  it('is claimed once a day', () => {
    const claimed = claimPurse(createAccount(), '2026-11-17')!;
    expect(claimed.purseDayKey).toBe('2026-11-17');
    expect(purseDue(claimed, '2026-11-17')).toBe(false);
    expect(claimPurse(claimed, '2026-11-17')).toBeNull();
    expect(purseDue(claimed, '2026-11-18')).toBe(true);
  });

  it('pays a fifth of a boss kill of gold, rounded to 5', () => {
    expect(purseGold(1)).toBe(10);
    expect(purseGold(6)).toBe(20);
    expect(purseGold(10)).toBe(30);
  });
});
