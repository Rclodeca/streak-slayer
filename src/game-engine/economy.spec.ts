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
  goldPrice,
  goldPriceFactor,
  pouchGold,
  purseGold,
  roundPrice,
  servicePrice,
  slotPrice,
  warePrice,
} from './constants/economy';
import { CHALLENGE_DEFS } from './challenges';

const sumGems = (from: number, to: number) => {
  let total = 0;
  for (let n = from; n <= to; n++) total += TALENT_COST(n, 1, 0).gems;
  return total;
};
// Every main and offshoot takes one more rank per Deeper roots (two of them); tops don't.
const totalRanks = TALENT_DEFS.reduce((s, d) => s + d.maxRank + (d.kind === 'top' ? 0 : 2), 0);

describe('the gem price sheet', () => {
  it('the tree runs to 163 ranks', () => expect(totalRanks).toBe(163));

  it('the tree costs the spec gem bands', () => {
    expect([3, 4, 20, 21, 40, 41, 60, 61, 163].map((n) => TALENT_COST(n, 1, 0).gems)).toEqual([0, 2, 2, 3, 3, 4, 4, 5, 5]);
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
    expect(warePrice('common', 1, 2)).toBeLessThan(warePrice('rare', 1, 2));
    expect(warePrice('rare', 1, 2)).toBeLessThan(warePrice('relic', 1, 2));
    expect(warePrice('rare', 10, 2)).toBeGreaterThan(warePrice('rare', 1, 2));
  });

  it("an epic costs a few bosses' worth", () => {
    for (const i of [1, 10, 30]) {
      const bosses = warePrice('epic', i, 2) / bossGold(i);
      expect(bosses).toBeGreaterThanOrEqual(3);
      expect(bosses).toBeLessThanOrEqual(5);
    }
  });

  it('roundPrice rounds to 5', () => {
    expect(roundPrice(52)).toBe(50);
    expect(roundPrice(1)).toBe(5);
  });
});

describe('the gold price sheet', () => {
  it('prices rise 0.1 per prestige rank from 0.8, clamped to the ladder', () => {
    expect([0, 1, 2, 3, 4, 5].map(goldPriceFactor)).toEqual([0.8, 0.9, 1, 1.1, 1.2, 1.3]);
    expect(goldPriceFactor(-1)).toBe(0.8);
    expect(goldPriceFactor(2.7)).toBe(1);
    expect(goldPriceFactor(9)).toBe(1.3);
  });

  it('a price is boss kills at the current boss, times the factor, rounded to 5', () => {
    expect(goldPrice(1, 10, 2)).toBe(140); // 140 × 1.0
    expect(goldPrice(1, 10, 0)).toBe(110); // 112 → 110
    expect(goldPrice(0.5, 1, 0)).toBe(20);
  });

  it('a talent rank is half a kill, whatever ranks came before', () => {
    expect(TALENT_COST(1, 20, 2).gold).toBe(120);
    expect(TALENT_COST(150, 20, 2).gold).toBe(120);
    expect(TALENT_COST(150, 20, 4).gold).toBe(145); // 144 → 145
  });

  it('slots, services and the climbs follow the spec', () => {
    expect([0, 1, 2, 3].map((u) => slotPrice(u, 10, 2))).toEqual([280, 560, 840, 1120]);
    expect(slotPrice(4, 10, 2)).toBeNull();
    expect([0, 1, 2].map((b) => servicePrice('enchant', b, 10, 2))).toEqual([420, 840, 1680]);
    expect([0, 1].map((b) => servicePrice('reroll', b, 10, 2))).toEqual([280, 560]);
    expect([0, 1].map((b) => servicePrice('overdrive', b, 10, 2))).toEqual([700, 1400]);
  });

  it('the Pouch pays more after a prestige; the purse does not', () => {
    expect(pouchGold(10, 4)).toBeGreaterThan(pouchGold(10, 0));
    expect(purseGold(10)).toBe(30); // 0.2 × 140 = 28 → 30
  });
});
