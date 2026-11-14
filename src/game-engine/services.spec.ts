import { describe, expect, it } from 'vitest';
import { servicePrice, slotPrice } from './constants/economy';
import { createHabit } from './habits';
import { ITEM_CATALOG, maxEquipSlots } from './items';
import { createRng } from './rng';
import { buyEnchant, buyOverdrive, buyReroll, buySlot, enchantTargets, serviceState } from './services';
import type { Character, Habit } from './types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const starterStats = { physicalDamage: 10, magicDamage: 10, healing: 6, health: 50, trueDamage: 6 };
  return {
    level: 10,
    exp: 0,
    starterStats,
    currentHealth: starterStats.health,
    ownedItemIds: [],
    equippedItemIds: [],
    critChance: 0.01,
    ...overrides,
  };
}

const rng = createRng(7);
const good = (name: string, period: 'daily' | 'weekly' = 'daily') => createHabit(name, period, 'easy', false, createRng(3));
const bad = (name: string) => createHabit(name, 'daily', 'easy', true, createRng(3));
const wornItems = ITEM_CATALOG.filter((item) => item.type !== 'consumable' && item.bonuses.length > 0).slice(0, 5);
const wearing = (n: number) => ({
  ownedItemIds: wornItems.slice(0, n).map((item) => item.id),
  equippedItemIds: wornItems.slice(0, n).map((item) => item.id),
});

describe('service prices', () => {
  it('prices climb with each buy', () => {
    // Boss 10 pays 140 gold.
    expect(servicePrice('enchant', 0, 10)).toBe(1400);
    expect(servicePrice('enchant', 1, 10)).toBe(2800);
    expect(servicePrice('reroll', 0, 10)).toBe(280);
    expect(servicePrice('reroll', 2, 10)).toBe(630);
  });

  it('slots come in two steps and then stop', () => {
    expect(slotPrice(0, 10)).toBe(2100);
    expect(slotPrice(1, 10)).toBe(4200);
    expect(slotPrice(2, 10)).toBeNull();
  });
});

describe('buyReroll', () => {
  it("takes the price and changes only that skill's type", () => {
    const habits: Habit[] = [good('Read'), good('Run'), good('Stretch', 'weekly')];
    const result = buyReroll(makeCharacter({ gold: 1000 }), habits, habits[1].id, 1, rng)!;
    expect(result.character.gold).toBe(1000 - 100);
    expect(result.character.serviceBuys?.reroll).toBe(1);
    expect(result.habits[0]).toEqual(habits[0]);
    expect(result.habits[2]).toEqual(habits[2]);
    expect(result.habit.id).toBe(habits[1].id);
    expect(result.habit.damageType).not.toBe(habits[1].damageType);
  });

  it('refuses a skill that is not there', () => {
    expect(buyReroll(makeCharacter({ gold: 1000 }), [good('Read')], 'nope', 1, rng)).toBeNull();
  });
});

describe('buyOverdrive', () => {
  it('sets isOverdrive on the picked skill', () => {
    const habits = [good('Read'), good('Run')];
    const result = buyOverdrive(makeCharacter({ gold: 1000 }), habits, habits[0].id, 1)!;
    expect(result.character.gold).toBe(1000 - 250);
    expect(result.habits[0].isOverdrive).toBe(true);
    expect(result.habits[1].isOverdrive).toBeFalsy();
    expect(result.character.serviceBuys?.overdrive).toBe(1);
  });

  it('refuses a bad habit and one that already has it', () => {
    const habits = [bad('Doomscroll'), { ...good('Read'), isOverdrive: true }];
    const character = makeCharacter({ gold: 1000 });
    expect(buyOverdrive(character, habits, habits[0].id, 1)).toBeNull();
    expect(buyOverdrive(character, habits, habits[1].id, 1)).toBeNull();
  });
});

describe('buyEnchant', () => {
  it('adds the item to doubledItemIds', () => {
    const character = makeCharacter({ gold: 5000, ...wearing(2) });
    const result = buyEnchant(character, wornItems[0].id, 1)!;
    expect(result.character.gold).toBe(5000 - 500);
    expect(result.character.doubledItemIds).toEqual([wornItems[0].id]);
    expect(result.item.id).toBe(wornItems[0].id);
    expect(result.character.serviceBuys?.enchant).toBe(1);
  });

  it('refuses an item that is not worn or is already enchanted', () => {
    const character = makeCharacter({ gold: 5000, ...wearing(2), doubledItemIds: [wornItems[1].id] });
    expect(buyEnchant(character, wornItems[3].id, 1)).toBeNull();
    expect(buyEnchant(character, wornItems[1].id, 1)).toBeNull();
  });

  it('has no cap: a fifth enchant is allowed', () => {
    const character = makeCharacter({ gold: 1_000_000, ...wearing(5), doubledItemIds: wornItems.slice(0, 4).map((item) => item.id) });
    expect(enchantTargets(character).map((item) => item.id)).toEqual([wornItems[4].id]);
    expect(buyEnchant(character, wornItems[4].id, 1)).not.toBeNull();
  });
});

describe('buySlot', () => {
  it('goes 4 → 6 → 8 and then refuses', () => {
    let character = makeCharacter({ gold: 100_000 });
    character = buySlot(character, 1)!.character;
    expect(maxEquipSlots(character)).toBe(6);
    const second = buySlot(character, 1)!;
    expect(second.slots).toBe(8);
    expect(buySlot(second.character, 1)).toBeNull();
  });

  it('buys from the steps already bought', () => {
    const character = makeCharacter({ gold: 100_000, slotUpgrades: 1 });
    const result = buySlot(character, 1)!;
    expect(result.slots).toBe(8);
    expect(result.character.slotUpgrades).toBe(2);
  });
});

describe('short on gold or fallen', () => {
  const habits = [good('Read')];
  const rich = makeCharacter({ gold: 100_000, ...wearing(1) });
  const poor = makeCharacter({ gold: 1, ...wearing(1) });

  it('buys nothing when short', () => {
    expect(buyReroll(poor, habits, habits[0].id, 1, rng)).toBeNull();
    expect(buyOverdrive(poor, habits, habits[0].id, 1)).toBeNull();
    expect(buyEnchant(poor, wornItems[0].id, 1)).toBeNull();
    expect(buySlot(poor, 1)).toBeNull();
  });

  it('a fallen hero buys nothing', () => {
    const fallen = { ...rich, currentHealth: 0 };
    expect(buyReroll(fallen, habits, habits[0].id, 1, rng)).toBeNull();
    expect(buyOverdrive(fallen, habits, habits[0].id, 1)).toBeNull();
    expect(buyEnchant(fallen, wornItems[0].id, 1)).toBeNull();
    expect(buySlot(fallen, 1)).toBeNull();
  });
});

describe('serviceState', () => {
  const habits = [good('Read')];

  it('reads buy and short', () => {
    expect(serviceState(makeCharacter({ gold: 1000 }), habits, 'reroll', 1)).toEqual({ price: 100, status: 'buy', bought: 0 });
    expect(serviceState(makeCharacter({ gold: 10 }), habits, 'reroll', 1).status).toBe('short');
  });

  it('reads none when there is nothing to pick', () => {
    const character = makeCharacter({ gold: 100_000 });
    expect(serviceState(character, [], 'reroll', 1).status).toBe('none');
    expect(serviceState(character, [bad('Doomscroll')], 'overdrive', 1).status).toBe('none');
    expect(serviceState(character, habits, 'enchant', 1).status).toBe('none');
  });

  it('reads maxed at 8 slots', () => {
    expect(serviceState(makeCharacter({ gold: 100_000, slotUpgrades: 2 }), habits, 'slot', 1)).toEqual({ price: 0, status: 'maxed', bought: 2 });
  });

  it('counts what was bought this run', () => {
    const character = makeCharacter({ gold: 100_000, serviceBuys: { reroll: 2 } });
    expect(serviceState(character, habits, 'reroll', 1)).toMatchObject({ price: 225, bought: 2 });
  });
});
