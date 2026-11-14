import { describe, expect, it } from 'vitest';
import { createAccount, recordLevel, spendGems } from './account';

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
