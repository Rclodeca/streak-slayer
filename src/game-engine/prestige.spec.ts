import { describe, expect, it } from 'vitest';
import { createAccount } from './account';
import { createCharacter } from './character';
import { itemBonusPercent } from './items';
import {
  canPrestige,
  deeperRootsCount,
  MAX_PRESTIGE,
  nextPrestigeRank,
  PRESTIGE_RANKS,
  prestigeBonusPercent,
  prestigeMark,
  prestigeOpensBetween,
  prestigeRank,
  withPrestige,
} from './prestige';
import { createRng } from './rng';

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

describe('prestige ranks', () => {
  it('opens at 30, 45, 60, 75, 90 and stops after V', () => {
    expect(PRESTIGE_RANKS.map((r) => r.bar)).toEqual([30, 45, 60, 75, 90]);
    expect(PRESTIGE_RANKS.map((r) => r.special)).toEqual(['dungeon', 'deeper-roots', 'dungeon', 'deeper-roots', 'mythic-skin']);
    expect(nextPrestigeRank(0)?.bar).toBe(30);
    expect(nextPrestigeRank(4)?.bar).toBe(90);
    expect(nextPrestigeRank(5)).toBeNull();
  });
  it('adds 20/10/5 percent per rank and nothing else', () => {
    expect(prestigeBonusPercent({ prestige: 2 }, 'allDamage')).toBe(40);
    expect(prestigeBonusPercent({ prestige: 2 }, 'health')).toBe(20);
    expect(prestigeBonusPercent({ prestige: 2 }, 'expGain')).toBe(10);
    expect(prestigeBonusPercent({ prestige: 2 }, 'physicalDamage')).toBe(0);
    expect(prestigeBonusPercent({}, 'allDamage')).toBe(0);
  });
  it('sums into itemBonusPercent with items and talents', () => {
    const c = { ...createCharacter(createRng(1)), prestige: 5 };
    expect(itemBonusPercent(c, 'allDamage')).toBe(100);
    expect(itemBonusPercent(c, 'health')).toBe(50);
    expect(itemBonusPercent(c, 'expGain')).toBe(25);
  });
  it('opens on the current level, alive and named', () => {
    const at = (level: number, extra = {}) => ({ ...createCharacter(createRng(1)), heroPending: false, level, ...extra });
    expect(canPrestige(at(29), 0)).toBe(false);
    expect(canPrestige(at(30), 0)).toBe(true);
    expect(canPrestige(at(44), 1)).toBe(false);
    expect(canPrestige(at(45), 1)).toBe(true);
    expect(canPrestige(at(90), 5)).toBe(false);
    expect(canPrestige(at(30, { currentHealth: 0 }), 0)).toBe(false);
    expect(canPrestige(at(30, { heroPending: true }), 0)).toBe(false);
  });
  it('says when a level-up crosses the next bar', () => {
    expect(prestigeOpensBetween(29, 30, 0)).toBe(true);
    expect(prestigeOpensBetween(30, 31, 0)).toBe(false);
    expect(prestigeOpensBetween(43, 46, 1)).toBe(true);
    expect(prestigeOpensBetween(69, 72, 5)).toBe(false);
  });
  it('counts Deeper roots at II and IV', () => {
    expect([0, 1, 2, 3, 4, 5].map(deeperRootsCount)).toEqual([0, 0, 1, 1, 2, 2]);
  });
  it('copies the rank onto the character only when it differs', () => {
    const c = { ...createCharacter(createRng(1)), prestige: 2 };
    expect(withPrestige(c, 2)).toBe(c);
    expect(withPrestige(c, 3).prestige).toBe(3);
  });
});
