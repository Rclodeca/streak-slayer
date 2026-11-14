// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GOLD_POUCH, addDaysToDayKey, createRng, dailyPeriodKey, pouchGold } from '../game-engine';
import { useHabitStore } from '../store/habitStore';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useItemDropQueue } from './useItemDropQueue';
import { useVault } from './useVault';

describe('useVault', () => {
  beforeEach(() => setActivePinia(createPinia()));

  // The drop queue is a module-scope singleton, so drain it between tests.
  afterEach(() => {
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
  });

  function stocked(gems: number) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 0 });
    useAccountStore().addGems(gems);
    const vault = useVault();
    vault.ensureStock();
    return { characterStore, vault };
  }

  it('buy spends gems from the account and opens the drop popup', () => {
    const { characterStore, vault } = stocked(50);
    const ware = vault.stock.value!.wares[0];
    expect(vault.buy(ware.itemId)).toBe(true);
    expect(useAccountStore().account.gems).toBe(50 - ware.gems);
    expect(characterStore.character.ownedItemIds).toContain(ware.itemId);
    const queue = useItemDropQueue();
    expect(queue.current.value?.id).toBe(ware.itemId);
    expect(queue.bought.value).toBe(true);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'vault-bought', gems: ware.gems });
  });

  it('a double tap buys once', () => {
    const { vault } = stocked(50);
    const ware = vault.stock.value!.wares[0];
    expect(vault.buy(ware.itemId)).toBe(true);
    expect(vault.buy(ware.itemId)).toBe(false);
    expect(useAccountStore().account.gems).toBe(50 - ware.gems);
  });

  it('short on gems: false, gems and character unchanged', () => {
    const { characterStore, vault } = stocked(1);
    const before = characterStore.character;
    expect(vault.buy(vault.stock.value!.wares[0].itemId)).toBe(false);
    expect(useAccountStore().account.gems).toBe(1);
    expect(characterStore.character).toBe(before);
    expect(useActivityLogStore().entries).toHaveLength(0);
  });

  it('the pouch turns gems into gold once a day', () => {
    const { characterStore, vault } = stocked(20);
    const gold = pouchGold(useBossStore().boss.index);
    expect(vault.pouch.value).toMatchObject({ status: 'buy', gold });
    expect(vault.buyPouch()).toBe(true);
    expect(vault.buyPouch()).toBe(false);
    expect(characterStore.character.gold).toBe(gold);
    expect(useAccountStore().account.gems).toBe(20 - GOLD_POUCH.gems);
    expect(vault.pouch.value.status).toBe('cooldown');
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'vault-bought', name: 'Gold Pouch', gems: GOLD_POUCH.gems, gold });
  });

  it('buyFreeze freezes one skill for gems and logs it', () => {
    stocked(10);
    const habitStore = useHabitStore();
    const read = habitStore.addHabit('Read', 'daily', 'easy', false, createRng(1));
    const run = habitStore.addHabit('Run', 'daily', 'easy', false, createRng(2));
    const vault = useVault();
    const tomorrow = addDaysToDayKey(dailyPeriodKey(new Date()), 1);

    expect(vault.buyFreeze(read.id, tomorrow, 2)).toBe(true);

    expect(habitStore.habits.find((h) => h.id === read.id)!.frozenDayKeys).toEqual([tomorrow, addDaysToDayKey(tomorrow, 1)]);
    expect(habitStore.habits.find((h) => h.id === run.id)!.frozenDayKeys).toBeUndefined();
    expect(useAccountStore().account.gems).toBe(6);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'freeze-bought', habitName: 'Read', fromDayKey: tomorrow, count: 2, period: 'daily', gems: 4 });
  });

  it('buyFreeze on a skill deleted meanwhile, or short on gems, spends nothing', () => {
    stocked(1);
    const habitStore = useHabitStore();
    const read = habitStore.addHabit('Read', 'daily', 'easy', false, createRng(1));
    const tomorrow = addDaysToDayKey(dailyPeriodKey(new Date()), 1);
    const vault = useVault();
    expect(vault.buyFreeze(read.id, tomorrow, 1)).toBe(false);
    expect(vault.buyFreeze('gone', tomorrow, 1)).toBe(false);
    expect(useAccountStore().account.gems).toBe(1);
  });
});
