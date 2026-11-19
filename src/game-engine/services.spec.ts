import { describe, expect, it } from 'vitest';
import { servicePrice, slotPrice } from './constants/economy';
import { createHabit } from './habits';
import { ITEM_CATALOG, maxEquipSlots } from './items';
import { createRng } from './rng';
import { buyEnchant, buyOverdrive, buyReroll, buySlot, enchantTargets, nextService, serviceState, serviceTurn, syncServiceTurn, turnDaysLeft } from './services';
import type { ServiceId } from './services';
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
// The service on offer, so it can be bought.
const on = (id: ServiceId, rerolls?: number) => ({ serviceTurn: { id, startDayKey: '2026-11-01', ...(rerolls ? { rerolls } : {}) } });

describe('service prices', () => {
  it('prices climb x2 with each one held', () => {
    // Boss 10 pays 140 gold; prestige II prices at x1, then the run price factor (0.7), rounded to 5.
    expect(servicePrice('enchant', 0, 10, 2)).toBe(295);
    expect(servicePrice('enchant', 1, 10, 2)).toBe(590);
    expect(servicePrice('reroll', 0, 10, 2)).toBe(195);
    expect(servicePrice('reroll', 2, 10, 2)).toBe(785);
  });

  it('slots come one at a time, four of them, and then stop', () => {
    expect([0, 1, 2, 3].map((n) => slotPrice(n, 10, 2))).toEqual([195, 390, 590, 785]);
    expect(slotPrice(4, 10, 2)).toBeNull();
  });
});

describe('buyReroll', () => {
  it("takes the price, changes only that skill's type and counts it on the turn", () => {
    const habits: Habit[] = [good('Read'), good('Run'), good('Stretch', 'weekly')];
    const result = buyReroll(makeCharacter({ gold: 1000, ...on('reroll') }), habits, habits[1].id, 1, rng)!;
    expect(result.character.gold).toBe(1000 - 55); // 2 kills × 50 × 0.8 × 0.7, rounded to 5
    expect(result.character.serviceTurn?.rerolls).toBe(1);
    expect(result.habits[0]).toEqual(habits[0]);
    expect(result.habits[2]).toEqual(habits[2]);
    expect(result.habit.id).toBe(habits[1].id);
    expect(result.habit.damageType).not.toBe(habits[1].damageType);
  });

  it('refuses a skill that is not there', () => {
    expect(buyReroll(makeCharacter({ gold: 1000, ...on('reroll') }), [good('Read')], 'nope', 1, rng)).toBeNull();
  });
});

describe('buyOverdrive', () => {
  it('sets isOverdrive on the picked skill', () => {
    const habits = [good('Read'), good('Run')];
    const result = buyOverdrive(makeCharacter({ gold: 1000, ...on('overdrive') }), habits, habits[0].id, 1)!;
    expect(result.character.gold).toBe(1000 - 140);
    expect(result.habits[0].isOverdrive).toBe(true);
    expect(result.habits[1].isOverdrive).toBeFalsy();
  });

  it('refuses a bad habit and one that already has it', () => {
    const habits = [bad('Doomscroll'), { ...good('Read'), isOverdrive: true }];
    const character = makeCharacter({ gold: 1000, ...on('overdrive') });
    expect(buyOverdrive(character, habits, habits[0].id, 1)).toBeNull();
    expect(buyOverdrive(character, habits, habits[1].id, 1)).toBeNull();
  });
});

describe('buyEnchant', () => {
  it('adds the item to doubledItemIds', () => {
    const character = makeCharacter({ gold: 5000, ...wearing(2), ...on('enchant') });
    const result = buyEnchant(character, wornItems[0].id, 1)!;
    expect(result.character.gold).toBe(5000 - 85);
    expect(result.character.doubledItemIds).toEqual([wornItems[0].id]);
    expect(result.item.id).toBe(wornItems[0].id);
  });

  it('refuses an item that is not worn or is already enchanted', () => {
    const character = makeCharacter({ gold: 5000, ...wearing(2), doubledItemIds: [wornItems[1].id], ...on('enchant') });
    expect(buyEnchant(character, wornItems[3].id, 1)).toBeNull();
    expect(buyEnchant(character, wornItems[1].id, 1)).toBeNull();
  });

  it('has no cap: a fifth enchant is allowed', () => {
    const character = makeCharacter({ gold: 1_000_000, ...wearing(5), doubledItemIds: wornItems.slice(0, 4).map((item) => item.id), ...on('enchant') });
    expect(enchantTargets(character).map((item) => item.id)).toEqual([wornItems[4].id]);
    expect(buyEnchant(character, wornItems[4].id, 1)).not.toBeNull();
  });
});

describe('buySlot', () => {
  it('goes 4 → 5 → 6 → 7 → 8 and then refuses', () => {
    let character = makeCharacter({ gold: 100_000, ...on('slot') });
    for (const slots of [5, 6, 7, 8]) {
      const result = buySlot(character, 1)!;
      expect(result.slots).toBe(slots);
      character = result.character;
    }
    expect(maxEquipSlots(character)).toBe(8);
    expect(buySlot(character, 1)).toBeNull();
  });

  it('buys from the slots already bought', () => {
    const result = buySlot(makeCharacter({ gold: 100_000, slotUpgrades: 3, ...on('slot') }), 1)!;
    expect(result.slots).toBe(8);
    expect(result.character.slotUpgrades).toBe(4);
  });
});

describe('only the service on turn', () => {
  it('sells nothing else', () => {
    const habits = [good('Read')];
    const character = makeCharacter({ gold: 100_000, ...wearing(1), ...on('slot') });
    expect(buyReroll(character, habits, habits[0].id, 1, rng)).toBeNull();
    expect(buyOverdrive(character, habits, habits[0].id, 1)).toBeNull();
    expect(buyEnchant(character, wornItems[0].id, 1)).toBeNull();
    expect(buySlot(makeCharacter({ gold: 100_000 }), 1)).toBeNull();
  });
});

describe('short on gold or fallen', () => {
  const habits = [good('Read')];
  const rich = (id: ServiceId) => makeCharacter({ gold: 100_000, ...wearing(1), ...on(id) });
  const poor = (id: ServiceId) => makeCharacter({ gold: 1, ...wearing(1), ...on(id) });

  it('buys nothing when short', () => {
    expect(buyReroll(poor('reroll'), habits, habits[0].id, 1, rng)).toBeNull();
    expect(buyOverdrive(poor('overdrive'), habits, habits[0].id, 1)).toBeNull();
    expect(buyEnchant(poor('enchant'), wornItems[0].id, 1)).toBeNull();
    expect(buySlot(poor('slot'), 1)).toBeNull();
  });

  it('a fallen hero buys nothing', () => {
    const fallen = (id: ServiceId) => ({ ...rich(id), currentHealth: 0 });
    expect(buyReroll(fallen('reroll'), habits, habits[0].id, 1, rng)).toBeNull();
    expect(buyOverdrive(fallen('overdrive'), habits, habits[0].id, 1)).toBeNull();
    expect(buyEnchant(fallen('enchant'), wornItems[0].id, 1)).toBeNull();
    expect(buySlot(fallen('slot'), 1)).toBeNull();
  });
});

describe('serviceState', () => {
  const habits = [good('Read')];

  it('reads buy and short', () => {
    expect(serviceState(makeCharacter({ gold: 1000 }), habits, 'reroll', 1)).toEqual({ price: 55, status: 'buy', bought: 0 });
    expect(serviceState(makeCharacter({ gold: 10 }), habits, 'reroll', 1).status).toBe('short');
  });

  it('reads none when there is nothing to pick', () => {
    const character = makeCharacter({ gold: 100_000 });
    expect(serviceState(character, [], 'reroll', 1).status).toBe('none');
    expect(serviceState(character, [bad('Doomscroll')], 'overdrive', 1).status).toBe('none');
    expect(serviceState(character, habits, 'enchant', 1).status).toBe('none');
  });

  it("prices by the hero's prestige rank", () => {
    expect(serviceState(makeCharacter({ gold: 100_000, prestige: 3 }), habits, 'slot', 10).price).toBe(slotPrice(0, 10, 3));
  });

  it('reads maxed at 8 slots', () => {
    expect(serviceState(makeCharacter({ gold: 100_000, slotUpgrades: 4 }), habits, 'slot', 1)).toEqual({ price: 0, status: 'maxed', bought: 4 });
  });

  it('prices by what the hero has now, a reroll by this turn', () => {
    const rich = makeCharacter({ gold: 100_000, ...wearing(3), doubledItemIds: [wornItems[0].id, wornItems[1].id], ...on('reroll', 2) });
    const overdriven = [{ ...good('Read'), isOverdrive: true }, good('Run')];
    expect(serviceState(rich, habits, 'reroll', 1)).toMatchObject({ price: servicePrice('reroll', 2, 1, 0), bought: 2 });
    expect(serviceState(rich, overdriven, 'overdrive', 1).bought).toBe(1);
    expect(serviceState(rich, habits, 'overdrive', 1).bought).toBe(0);
    expect(serviceState(rich, habits, 'enchant', 1).bought).toBe(2);
    expect(serviceState({ ...rich, ...on('enchant') }, habits, 'reroll', 1).bought).toBe(0);
  });
});

describe('the service turn', () => {
  const habits = [good('Read')];
  const ready = makeCharacter({ ...wearing(1) });

  it('a new run starts on Item slots', () => {
    expect(serviceTurn(ready, habits, '2026-11-10')).toEqual({ id: 'slot', startDayKey: '2026-11-10' });
  });

  it('holds for 3 days, then the next in order takes it', () => {
    const character = makeCharacter({ ...wearing(1), ...on('slot') });
    expect(serviceTurn(character, habits, '2026-11-03')).toBe(character.serviceTurn);
    expect(serviceTurn(character, habits, '2026-11-04')).toEqual({ id: 'overdrive', startDayKey: '2026-11-04' });
    expect(serviceTurn(character, habits, '2026-11-08')).toEqual({ id: 'reroll', startDayKey: '2026-11-07' });
    expect(serviceTurn(character, habits, '2026-11-12')).toEqual({ id: 'enchant', startDayKey: '2026-11-10' });
  });

  it('a new turn starts its rerolls over', () => {
    const character = makeCharacter({ ...wearing(1), ...on('reroll', 3) });
    expect(serviceTurn(character, habits, '2026-11-04').rerolls).toBeUndefined();
  });

  it('passes over full slots and a service with nothing to work on', () => {
    const full = makeCharacter({ slotUpgrades: 4 });
    expect(nextService(full, habits, 'enchant')).toBe('overdrive');
    expect(nextService(full, habits, null)).toBe('overdrive');
    expect(nextService(full, [bad('Doomscroll')], 'slot')).toBe('reroll');
    expect(nextService(makeCharacter({ ...wearing(1) }), [], 'slot')).toBe('enchant');
  });

  it('with nothing to work on at all, simply the next one', () => {
    expect(nextService(makeCharacter({ slotUpgrades: 4 }), [], 'slot')).toBe('overdrive');
  });

  it('syncs onto the character, the same object while it holds', () => {
    const synced = syncServiceTurn(ready, habits, '2026-11-10');
    expect(synced.serviceTurn).toEqual({ id: 'slot', startDayKey: '2026-11-10' });
    expect(syncServiceTurn(synced, habits, '2026-11-12')).toBe(synced);
  });

  it('counts the days left, today included', () => {
    const turn = { id: 'slot' as const, startDayKey: '2026-11-10' };
    expect(['2026-11-10', '2026-11-11', '2026-11-12'].map((key) => turnDaysLeft(turn, key))).toEqual([3, 2, 1]);
  });
});
