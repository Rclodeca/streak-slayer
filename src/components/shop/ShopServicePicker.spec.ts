// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHabit, createRng, ITEM_CATALOG } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import ShopServicePicker from './ShopServicePicker.vue';

enableAutoUnmount(afterEach);

const worn = ITEM_CATALOG.filter((item) => item.type !== 'consumable' && item.bonuses.length > 0).slice(0, 3);

describe('ShopServicePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    const characterStore = useCharacterStore();
    characterStore.setCharacter({
      ...characterStore.character,
      level: 10,
      gold: 100000,
      ownedItemIds: worn.map((item) => item.id),
      equippedItemIds: worn.map((item) => item.id),
      doubledItemIds: [worn[2].id],
    });
    useHabitStore().setHabits([
      createHabit('Read', 'daily', 'easy', false, createRng(3)),
      createHabit('Run', 'weekly', 'easy', false, createRng(4)),
      createHabit('Doomscroll', 'daily', 'easy', true, createRng(5)),
    ]);
  });

  // The picker opens for the service on turn, so it's put on the character first.
  const open = (service: 'reroll' | 'overdrive' | 'enchant') => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, serviceTurn: { id: service, startDayKey: '2026-11-01' } });
    return mount(ShopServicePicker, { props: { modelValue: true, service }, attachTo: document.body });
  };
  const confirm = () => document.querySelector<HTMLButtonElement>('.ok')!;
  const rows = () => [...document.querySelectorAll<HTMLElement>('.pick-row, .reroll-row')];

  it('confirm is disabled until a target is tapped, and tapping again unpicks it', async () => {
    open('reroll');
    await flushPromises();
    expect(confirm().disabled).toBe(true);
    expect(confirm().textContent).toContain('Pick a skill');
    rows()[0].click();
    await flushPromises();
    expect(confirm().disabled).toBe(false);
    rows()[0].click();
    await flushPromises();
    expect(confirm().disabled).toBe(true);
  });

  it('confirming Overdrive sets it on the picked skill, pays, and closes', async () => {
    const wrapper = open('overdrive');
    await flushPromises();
    expect(rows()).toHaveLength(2); // the bad habit is not offered
    rows()[0].click();
    await flushPromises();
    expect(confirm().textContent).toContain('Overdrive');
    confirm().click();
    await flushPromises();
    expect(useHabitStore().habits.find((habit) => habit.name === 'Read')?.isOverdrive).toBe(true);
    expect(useCharacterStore().character.gold).toBeLessThan(100000);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
  });

  it('the enchant list shows only worn, unenchanted items', async () => {
    open('enchant');
    await flushPromises();
    const names = rows().map((row) => row.textContent);
    expect(names).toHaveLength(2);
    expect(names.join('')).not.toContain(worn[2].name);
    expect(confirm().textContent).toContain('Pick an item');
  });
});
