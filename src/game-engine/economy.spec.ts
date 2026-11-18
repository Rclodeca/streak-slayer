import { describe, expect, it } from 'vitest';
import { TALENT_DEFS } from './constants/talentTree';
import {
  FREE_GEM_SOURCES,
  GEM_WARE_PRICES,
  GOLD_POUCH,
  LEVEL_GEM_MILESTONES,
  REVIVE_GEMS,
  SKIN_PRICES,
  TALENT_COST,
  TRIAL_GEMS,
  bossGold,
  roundPrice,
  warePrice,
} from './constants/economy';
import { CHALLENGE_DEFS } from './challenges';

const sumGems = (from: number, to: number) => {
  let total = 0;
  for (let n = from; n <= to; n++) total += TALENT_COST(n).gems;
  return total;
};
// Every main and offshoot takes one more rank per Deeper roots (two of them); tops don't.
const totalRanks = TALENT_DEFS.reduce((s, d) => s + d.maxRank + (d.kind === 'top' ? 0 : 2), 0);

describe('the gem price sheet', () => {
  it('the tree runs to 163 ranks', () => expect(totalRanks).toBe(163));

  it('the tree costs the spec bands, gold unchanged', () => {
    expect([3, 4, 20, 21, 40, 41, 60, 61, 163].map((n) => TALENT_COST(n).gems)).toEqual([0, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(TALENT_COST(4).gold).toBe(400);
    expect(TALENT_COST(97).gold).toBe(2000);
  });

  it('the whole tree is 689 gems, the base tree 359', () => {
    expect(sumGems(1, totalRanks)).toBe(689);
    expect(sumGems(1, 97)).toBe(359);
  });

  it('level milestones run to 70 and pay 120', () => {
    expect(LEVEL_GEM_MILESTONES.map((m) => m.level)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);
    expect(LEVEL_GEM_MILESTONES.map((m) => m.gems)).toEqual([4, 4, 4, 4, 8, 8, 8, 8, 12, 12, 12, 12, 12, 12]);
  });

  it('the one-time sources total 895', () => {
    expect(FREE_GEM_SOURCES).toEqual({ levels: 120, trials: 275, dungeonFirstClears: 100, prestige: 400 });
  });

  it('one-time gems cover the tree, a hero skin and two revives, with 56 to spare', () => {
    const oneTime = Object.values(FREE_GEM_SOURCES).reduce((a, b) => a + b, 0);
    const need = sumGems(1, totalRanks) + SKIN_PRICES.hero + 2 * REVIVE_GEMS;
    expect(need).toBe(839);
    expect(oneTime - need).toBe(56);
  });

  it('prices the gem sinks', () => {
    expect(REVIVE_GEMS).toBe(15);
    expect(SKIN_PRICES).toEqual({ hero: 120, home: 90, arena: 90 });
    expect(GEM_WARE_PRICES).toEqual({ rare: 6, epic: 12, relic: 20 });
    expect(GOLD_POUCH.gems).toBe(15);
  });

  it('one-time trials fit the trial budget', () => {
    expect(CHALLENGE_DEFS.length * TRIAL_GEMS).toBeLessThanOrEqual(FREE_GEM_SOURCES.trials);
  });
});

describe('economy gold sheet', () => {
  it('bossGold rises with the boss', () => expect(bossGold(10)).toBeGreaterThan(bossGold(1)));

  it('ware prices climb with rarity and the boss', () => {
    expect(warePrice('common', 1)).toBeLessThan(warePrice('rare', 1));
    expect(warePrice('rare', 1)).toBeLessThan(warePrice('relic', 1));
    expect(warePrice('rare', 10)).toBeGreaterThan(warePrice('rare', 1));
  });

  it("an epic costs a few bosses' worth", () => {
    for (const i of [1, 10, 30]) {
      const bosses = warePrice('epic', i) / bossGold(i);
      expect(bosses).toBeGreaterThanOrEqual(3);
      expect(bosses).toBeLessThanOrEqual(5);
    }
  });

  it('roundPrice rounds to 5', () => {
    expect(roundPrice(52)).toBe(50);
    expect(roundPrice(1)).toBe(5);
  });
});
