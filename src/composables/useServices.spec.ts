// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHabit, createRng, ITEM_CATALOG } from '../game-engine';
import type { ServiceId } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useServices } from './useServices';
import { useToast } from './useToast';

const item = ITEM_CATALOG.find((candidate) => candidate.type !== 'consumable' && candidate.bonuses.length > 0)!;

describe('useServices', () => {
  // The slot buy ignores a second tap within a moment, so each test starts a while after the last one.
  let clock = Date.parse('2026-11-14T12:00:00Z');
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({ toFake: ['Date'] });
    clock += 10_000;
    vi.setSystemTime(clock);
  });
  afterEach(() => vi.useRealTimers());

  // The reveal and the done popup are module-scoped, so clear them between tests.
  afterEach(() => {
    useServices().dismissReveal();
    useServices().dismissDone();
    useToast().dismiss();
  });

  // `turn`: the service on offer (bought only on its turn).
  function setup(gold = 100000, turn: ServiceId = 'slot') {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({
      ...characterStore.character,
      level: 10,
      gold,
      serviceTurn: { id: turn, startDayKey: '2026-11-13' },
      ownedItemIds: [item.id],
      equippedItemIds: [item.id],
      challenges: [{ id: 'enchant', takenDayKey: '2026-11-01', progress: 0 }],
    });
    const habitStore = useHabitStore();
    habitStore.setHabits([createHabit('Read', 'daily', 'easy', false, createRng(3)), createHabit('Run', 'weekly', 'easy', false, createRng(4))]);
    return { characterStore, habitStore, services: useServices() };
  }

  it('buyEnchant pays, enchants, logs and reveals', () => {
    const { characterStore, services } = setup(100000, 'enchant');
    const price = services.state('enchant').price;
    expect(services.buyEnchant(item.id)).toBe(true);
    expect(characterStore.character.gold).toBe(100000 - price);
    expect(characterStore.character.doubledItemIds).toEqual([item.id]);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'item-doubled', itemName: item.name, gold: price });
    expect(services.revealed.value?.id).toBe(item.id);
    const trial = characterStore.character.challenges!.find((entry) => entry.id === 'enchant')!;
    expect(trial.doneDayKey).toBeDefined();
    expect(trial.unclaimed).toBe(true);
  });

  it('buyOverdrive and buyReroll change the skill in the store and log it', () => {
    const { characterStore, habitStore, services } = setup(100000, 'overdrive');
    const [daily] = habitStore.habits;
    const before = daily.damageType;
    expect(services.buyOverdrive(daily.id)).toBe(true);
    expect(habitStore.habits[0].isOverdrive).toBe(true);
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'reroll', startDayKey: '2026-11-13' } });
    expect(services.buyReroll(daily.id)).toBe(true);
    expect(habitStore.habits[0].damageType).not.toBe(before);
    const kinds = useActivityLogStore().entries.map((entry) => entry.kind);
    expect(kinds).toContain('overdrive-granted');
    expect(kinds).toContain('skill-rerolled');
  });

  it('a reroll costs more the second time this turn', () => {
    const { habitStore, services } = setup(100000, 'reroll');
    const first = services.state('reroll').price;
    services.buyReroll(habitStore.habits[0].id);
    expect(services.state('reroll').price).toBeGreaterThan(first);
  });

  it('a double tap buys one slot each time, not two for one price', () => {
    const { characterStore, services } = setup(0);
    characterStore.setCharacter({ ...characterStore.character, gold: services.state('slot').price });
    expect(services.buySlot()).toBe(true);
    expect(services.buySlot()).toBe(false);
    expect(characterStore.character.slotUpgrades).toBe(1);
    expect(useActivityLogStore().entries.filter((entry) => entry.kind === 'item-slots-gained')).toHaveLength(1);
  });

  it('a quick double tap buys one slot even with gold for both', () => {
    const { characterStore, services } = setup(1_000_000);
    expect(services.buySlot()).toBe(true);
    expect(services.buySlot()).toBe(false);
    expect(characterStore.character.slotUpgrades).toBe(1);
    vi.setSystemTime(clock + 5_000);
    expect(services.buySlot()).toBe(true);
    expect(characterStore.character.slotUpgrades).toBe(2);
  });

  it('a skill deleted meanwhile buys nothing', () => {
    const { characterStore, services } = setup(100000, 'reroll');
    expect(services.buyReroll('gone')).toBe(false);
    expect(characterStore.character.gold).toBe(100000);
  });

  it('short on gold buys nothing and logs nothing', () => {
    const { characterStore, services } = setup(1, 'enchant');
    expect(services.buyEnchant(item.id)).toBe(false);
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'slot', startDayKey: '2026-11-13' } });
    expect(services.buySlot()).toBe(false);
    expect(characterStore.character.gold).toBe(1);
    expect(useActivityLogStore().entries).toHaveLength(0);
  });

  it('only the service on turn sells', () => {
    const { characterStore, habitStore, services } = setup(100000, 'slot');
    expect(services.buyReroll(habitStore.habits[0].id)).toBe(false);
    expect(services.buyEnchant(item.id)).toBe(false);
    expect(characterStore.character.gold).toBe(100000);
  });

  it('ensureTurn puts the turn on a new run, then moves it on after 3 days', () => {
    const { characterStore, services } = setup();
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: undefined });
    services.ensureTurn();
    expect(characterStore.character.serviceTurn).toEqual({ id: 'slot', startDayKey: '2026-11-14' });
    expect(services.daysLeft.value).toBe(3);
    expect(services.next.value).toBe('overdrive');
    vi.setSystemTime(Date.parse('2026-11-17T12:00:00Z'));
    services.ensureTurn();
    expect(characterStore.character.serviceTurn).toEqual({ id: 'overdrive', startDayKey: '2026-11-17' });
  });

  it('a slot or Overdrive buy says what it did in a toast, a reroll in its popup', () => {
    const { characterStore, habitStore, services } = setup();
    const toast = useToast();
    expect(services.buySlot()).toBe(true);
    expect(toast.current.value).toMatchObject({ art: 'services/slot', title: 'Item slots', text: '4 → 5 slots' });
    expect(services.done.value).toBeNull();
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'overdrive', startDayKey: '2026-11-13' } });
    const [daily] = habitStore.habits;
    services.buyOverdrive(daily.id);
    expect(toast.current.value).toMatchObject({ title: 'Overdrive', text: 'Read · 2 extra uses' });
    expect(services.done.value).toBeNull();
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: 'reroll', startDayKey: '2026-11-13' } });
    const before = habitStore.habits[0].damageType;
    services.buyReroll(daily.id);
    expect(services.done.value).toEqual({ id: 'reroll', habitName: 'Read', from: before, to: habitStore.habits[0].damageType });
    services.dismissDone();
    expect(services.done.value).toBeNull();
  });

  it('a buy that fails leaves no toast or popup', () => {
    const { services } = setup(1);
    expect(services.buySlot()).toBe(false);
    expect(useToast().current.value).toBeNull();
    expect(services.done.value).toBeNull();
  });
});
