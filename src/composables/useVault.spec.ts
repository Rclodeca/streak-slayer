// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GOLD_POUCH, addDaysToDayKey, createRng, dailyPeriodKey, formatDayKey, pouchGold } from '../game-engine';
import { useHabitStore } from '../store/habitStore';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useItemDropQueue } from './useItemDropQueue';
import { useToast } from './useToast';
import { useVault } from './useVault';

describe('useVault', () => {
  beforeEach(() => setActivePinia(createPinia()));

  // The drop queue is a module-scope singleton, so drain it between tests.
  afterEach(() => {
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
    useToast().dismiss();
  });

  function stocked(gems: number) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 0 });
    useAccountStore().addGems(gems);
    const vault = useVault();
    return { characterStore, vault };
  }

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
    expect(useToast().current.value).toMatchObject({ art: 'services/pouch', title: 'Gold Pouch', text: `+${gold.toLocaleString('en-US')} gold` });
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
    expect(useToast().current.value).toMatchObject({
      art: 'services/freeze',
      title: 'Streak Freeze',
      text: `Read · ${formatDayKey(tomorrow)} – ${formatDayKey(addDaysToDayKey(tomorrow, 1))}`,
    });
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
