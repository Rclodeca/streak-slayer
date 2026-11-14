import { describe, expect, it } from 'vitest';
import { TALENT_DEFS } from './constants/talentTree';
import { FREE_GEM_SOURCES, PLANNED_GEM_SINKS, TALENT_COST, TRIAL_GEMS, bossGold, roundPrice, warePrice } from './constants/economy';
import { CHALLENGE_DEFS } from './challenges';

describe('economy price sheet', () => {
  it('the tree costs the spec examples', () => {
    expect(TALENT_COST(1)).toEqual({ gold: 100, gems: 0 });
    expect(TALENT_COST(3)).toEqual({ gold: 300, gems: 0 });
    expect(TALENT_COST(4)).toEqual({ gold: 400, gems: 1 });
    expect(TALENT_COST(97)).toEqual({ gold: 2000, gems: 3 });
  });

  it('free gems finish the tree plus one skin and two revives', () => {
    const totalRanks = TALENT_DEFS.reduce((s, d) => s + d.maxRank, 0);
    let treeGems = 0;
    for (let n = 1; n <= totalRanks; n++) treeGems += TALENT_COST(n).gems;
    const free = FREE_GEM_SOURCES.levels + FREE_GEM_SOURCES.trials + FREE_GEM_SOURCES.dungeonFirstClears;
    const need = treeGems + PLANNED_GEM_SINKS.skin + 2 * PLANNED_GEM_SINKS.revive;
    expect(free).toBeGreaterThanOrEqual(need);
    expect(free).toBeLessThan(need * 1.15); // "tuned exactly": no big surplus
  });

  it('one-time trials fit the trial budget', () => {
    expect(CHALLENGE_DEFS.length * TRIAL_GEMS).toBeLessThanOrEqual(FREE_GEM_SOURCES.trials);
  });

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
