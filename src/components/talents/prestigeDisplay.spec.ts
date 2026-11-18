import { describe, expect, it } from 'vitest';
import { climbPercent, crestLabel, ladderSealed, ladderState, PRESTIGE_SPECIAL_LOOK } from './prestigeDisplay';

describe('the prestige crest', () => {
  it('reads the first bar, the climb, Ready, or Mythic', () => {
    expect(crestLabel(0, 22)).toBe('Lv 30');
    expect(crestLabel(0, 31)).toBe('Ready');
    expect(crestLabel(2, 44)).toBe('Lv 44 / 50');
    expect(crestLabel(2, 50)).toBe('Ready');
    expect(crestLabel(5, 58)).toBe('Mythic');
  });

  it('fills from level 1 to the next bar, never quite empty, full once Mythic', () => {
    expect(climbPercent(2, 25)).toBeCloseTo((24 / 49) * 100);
    expect(climbPercent(0, 1)).toBe(4);
    expect(climbPercent(2, 60)).toBe(100);
    expect(climbPercent(5, 58)).toBe(100);
  });
});

describe('the ladder', () => {
  it('marks ranks done, the next one, and the rest sealed', () => {
    expect([0, 1, 2, 3, 4].map((i) => ladderState(i, 2, 44))).toEqual(['done', 'done', 'next', 'sealed', 'sealed']);
    expect(ladderState(2, 2, 50)).toBe('ready');
    expect([0, 1, 2, 3, 4].map((i) => ladderState(i, 5, 80))).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('is sealed only before the first prestige, under level 30', () => {
    expect(ladderSealed(0, 29)).toBe(true);
    expect(ladderSealed(0, 30)).toBe(false);
    expect(ladderSealed(1, 5)).toBe(false);
  });

  it('names each rank’s special', () => {
    expect([1, 2, 3, 4, 5].map((r) => PRESTIGE_SPECIAL_LOOK[r].name)).toEqual(['Free dungeon', 'Deeper roots', 'Free dungeon', 'Deeper roots II', 'Mythic skin']);
    expect(PRESTIGE_SPECIAL_LOOK[2].line).toBe('Talents +1 max rank');
    expect(PRESTIGE_SPECIAL_LOOK[5].line).toBe('For every hero.');
  });
});
