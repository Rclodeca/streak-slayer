import { describe, expect, it } from 'vitest';
import { ladderSealed, ladderState, plinthLabel, PRESTIGE_SPECIAL_LOOK } from './prestigeDisplay';

describe('the crown plinth', () => {
  it('reads the bar, Ready, the rank count, or V', () => {
    expect(plinthLabel(0, 22)).toBe('Lv 30');
    expect(plinthLabel(0, 31)).toBe('Ready');
    expect(plinthLabel(2, 44)).toBe('2 / 5');
    expect(plinthLabel(2, 50)).toBe('Ready');
    expect(plinthLabel(5, 58)).toBe('V');
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
