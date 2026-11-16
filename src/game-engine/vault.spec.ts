import { describe, expect, it } from 'vitest';
import { GOLD_POUCH, pouchGold } from './constants/economy';
import { resolvePlayerDeathIfDead } from './combat';
import { createRng } from './rng';
import type { Character } from './types';
import { buyPouch, pouchState } from './vault';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return {
    level: 20,
    exp: 0,
    starterStats,
    currentHealth: starterStats.health,
    ownedItemIds: [],
    equippedItemIds: [],
    critChance: 0.01,
    ...overrides,
  };
}

const DAY = '2026-11-13';

describe('the Gold Pouch', () => {
  it('pays three kills of gold for its gems, once a day', () => {
    const character = makeCharacter({ gold: 50 });
    expect(pouchState(character, GOLD_POUCH.gems, 10, DAY)).toEqual({ gems: 5, gold: 420, status: 'buy' });
    const result = buyPouch(character, GOLD_POUCH.gems, 10, DAY)!;
    expect(pouchGold(10)).toBe(420);
    expect(result).toMatchObject({ gold: 420, gemsSpent: 5 });
    expect(result.character.gold).toBe(470);
    expect(pouchState(result.character, 99, 10, DAY).status).toBe('cooldown');
    expect(buyPouch(result.character, 99, 10, DAY)).toBeNull();
    expect(pouchState(result.character, 99, 10, '2026-11-14').status).toBe('buy');
  });

  it('short on gems buys nothing', () => {
    expect(pouchState(makeCharacter(), 4, 10, DAY).status).toBe('short');
    expect(buyPouch(makeCharacter(), 4, 10, DAY)).toBeNull();
  });

  it('a fallen hero buys nothing', () => {
    expect(buyPouch(makeCharacter({ currentHealth: 0 }), 99, 10, DAY)).toBeNull();
  });
});

describe('a death', () => {
  it('wipes the pouch mark', () => {
    const fallen = { ...makeCharacter(), pouchDayKey: DAY, currentHealth: 0 };
    const boss = { index: 3, personality: 'balanced', maxHealth: 100, health: 100, physicalAttack: 20, magicAttack: 20, armor: 10, magicResist: 10, lifestealPct: 0 } as const;
    const { character } = resolvePlayerDeathIfDead(fallen, { ...boss }, [], createRng(1));
    expect(character.pouchDayKey).toBeUndefined();
  });
});
