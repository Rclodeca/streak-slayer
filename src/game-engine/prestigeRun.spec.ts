import { describe, expect, it } from 'vitest';
import { createAccount } from './account';
import { bossNumber, generateBoss } from './boss';
import { createCharacter, heroClassFor } from './character';
import { characterGold } from './gold';
import { maxEquipSlots } from './items';
import { prestigeAccount, prestigeRun } from './prestigeRun';
import { createRng } from './rng';
import { MYTHIC_SKIN_IDS } from './skins';
import type { Character, Habit } from './types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-id',
    name: 'Test Habit',
    period: 'daily',
    difficulty: 'medium',
    damageType: 'physical',
    isBad: false,
    streakCount: 0,
    lastCompletedPeriodKey: null,
    lastCheckedPeriodKey: null,
    ...overrides,
  };
}

const trials = [{ id: 'resisted' as const, takenDayKey: '2026-11-01', count: 3, claimed: [] }];
const veteran = (overrides: Partial<Character> = {}): Character => ({
  ...createCharacter(createRng(1), 'warrior'),
  heroPending: false,
  name: 'Aria',
  level: 31,
  gold: 999,
  ownedItemIds: ['rusty-blade', 'steel-sword'],
  equippedItemIds: ['rusty-blade', 'steel-sword'],
  slotUpgrades: 2,
  talents: { might: 3 },
  talentsUnlocked: true,
  trials,
  deaths: 2,
  ...overrides,
});
const habits = [
  makeHabit({ id: 'a', streakCount: 12, rank: 4, isSpecial: true }),
  makeHabit({ id: 'b', streakCount: 3, rank: 1, isUlt: true, period: 'weekly' }),
];

describe('prestigeRun', () => {
  it('starts a new run at level 1, keeping talents, trials, streaks and ranks', () => {
    const result = prestigeRun(veteran(), { ...generateBoss(14, createRng(1)), shownIndex: 20 }, habits, 0, createRng(2))!;
    const { character } = result;
    expect(character.level).toBe(1);
    expect(character.heroPending).toBe(true);
    expect(character.name).toBe(veteran().name);
    expect(heroClassFor(character)).toBe('warrior');
    expect(character.talents).toEqual({ might: 3 });
    expect(character.talentsUnlocked).toBe(true);
    expect(character.trials).toEqual(trials);
    expect(character.prestige).toBe(1);
    expect(character.deaths).toBeUndefined();
    expect(characterGold(character)).toBe(0);
    expect(character.ownedItemIds).toEqual([]);
    expect(character.equippedItemIds).toEqual([]);
    expect(maxEquipSlots(character)).toBe(4);
    expect(result.boss.index).toBe(1);
    expect('shownIndex' in result.boss).toBe(false);
    expect(bossNumber(result.boss)).toBe(1);
    expect(result.habits.map((h) => [h.streakCount, h.rank])).toEqual([[12, 4], [3, 1]]);
    expect(result.habits.every((h) => !h.isSpecial && !h.isUlt)).toBe(true);
  });

  it('starts at full health with the new rank counted', () => {
    const { character } = prestigeRun(veteran({ talents: { vigor: 3 } }), generateBoss(14, createRng(1)), [], 0, createRng(2))!;
    expect(character.currentHealth).toBeGreaterThan(character.starterStats.health * 1.1);
  });

  it('is null below the bar, while dead, or on the new-hero screen', () => {
    const boss = generateBoss(14, createRng(1));
    expect(prestigeRun(veteran({ level: 29 }), boss, habits, 0, createRng(2))).toBeNull();
    expect(prestigeRun(veteran({ currentHealth: 0 }), boss, habits, 0, createRng(2))).toBeNull();
    expect(prestigeRun(veteran({ heroPending: true }), boss, habits, 0, createRng(2))).toBeNull();
    expect(prestigeRun(veteran({ level: 90 }), boss, habits, 5, createRng(2))).toBeNull();
  });
});

describe('prestigeAccount', () => {
  it('raises the rank and pays 80 gems', () => {
    const account = prestigeAccount({ gems: 5, highestLevel: 31 });
    expect(account.prestige).toBe(1);
    expect(account.gems).toBe(85);
    expect(account.highestLevel).toBe(31);
  });

  it('records a free dungeon at I and III', () => {
    expect(prestigeAccount({ gems: 5, highestLevel: 31 }).freeDungeons).toBe(1);
    expect(prestigeAccount({ gems: 0, highestLevel: 51, prestige: 1, freeDungeons: 1 }).freeDungeons).toBe(1);
    expect(prestigeAccount({ gems: 0, highestLevel: 51, prestige: 2, freeDungeons: 1 }).freeDungeons).toBe(2);
  });

  it('gives every Mythic skin at V', () => {
    const account = prestigeAccount({ ...createAccount(), prestige: 4, ownedSkinIds: ['warrior-steel'] });
    expect(account.prestige).toBe(5);
    expect(account.ownedSkinIds).toEqual(['warrior-steel', ...MYTHIC_SKIN_IDS]);
  });

  it('does nothing past V', () => {
    const top = { ...createAccount(), prestige: 5 };
    expect(prestigeAccount(top)).toBe(top);
  });
});
