import { describe, expect, it } from 'vitest';
import { createAccount } from './account';
import { MAX_PRESTIGE, prestigeMark, prestigeRank } from './prestige';

describe('prestigeRank', () => {
  it('is 0 on a new account and on saves from before prestige', () => {
    expect(prestigeRank(createAccount())).toBe(0);
    expect(prestigeRank({ gems: 0, highestLevel: 30 })).toBe(0);
  });

  it('stays within 0 and the cap', () => {
    expect(prestigeRank({ ...createAccount(), prestige: 3 })).toBe(3);
    expect(prestigeRank({ ...createAccount(), prestige: 9 })).toBe(MAX_PRESTIGE);
    expect(prestigeRank({ ...createAccount(), prestige: -1 })).toBe(0);
  });
});

describe('prestigeMark', () => {
  it('has no mark before the first prestige', () => {
    expect(prestigeMark(0)).toBeNull();
  });

  it('gives Veteran, Ascendant and Mythic in the rare, epic and relic colours', () => {
    expect([1, 2, 3, 4, 5].map((r) => prestigeMark(r))).toEqual([
      { rank: 1, numeral: 'I', title: 'Veteran', rarity: 'rare' },
      { rank: 2, numeral: 'II', title: 'Veteran', rarity: 'rare' },
      { rank: 3, numeral: 'III', title: 'Ascendant', rarity: 'epic' },
      { rank: 4, numeral: 'IV', title: 'Ascendant', rarity: 'epic' },
      { rank: 5, numeral: 'V', title: 'Mythic', rarity: 'relic' },
    ]);
  });
});
