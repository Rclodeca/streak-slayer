// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addDaysToDayKey, createHabit, createRng, dailyPeriodKey, weekStartOf } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useActivityLogStore } from '../../store/activityLogStore';
import { useHabitStore } from '../../store/habitStore';
import FreezePicker from './FreezePicker.vue';

enableAutoUnmount(afterEach);

describe('FreezePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useHabitStore().setHabits([
      { ...createHabit('Read', 'daily', 'easy', false, createRng(3)), id: 'read' },
      { ...createHabit('Hike', 'weekly', 'easy', false, createRng(4)), id: 'hike' },
      { ...createHabit('Doomscroll', 'daily', 'easy', true, createRng(5)), id: 'doom' },
    ]);
  });

  const today = () => dailyPeriodKey(new Date());
  const open = () => mount(FreezePicker, { props: { modelValue: true }, attachTo: document.body });
  const confirm = () => document.querySelector<HTMLButtonElement>('.ok')!;
  const rows = () => [...document.querySelectorAll<HTMLElement>('.reroll-row')];
  const tap = async (selector: string) => {
    document.querySelector<HTMLButtonElement>(selector)!.click();
    await flushPromises();
  };
  const pick = async (name: string) => {
    rows().find((row) => row.textContent!.includes(name))!.click();
    await flushPromises();
  };
  const frozenOf = (id: string) => useHabitStore().habits.find((h) => h.id === id)!.frozenDayKeys;

  it('lists the skills, not the bad habits, and waits for a pick', async () => {
    useAccountStore().account.gems = 10;
    open();
    await flushPromises();
    expect(rows().map((row) => row.textContent)).toEqual([expect.stringContaining('Read'), expect.stringContaining('Hike')]);
    expect(confirm().disabled).toBe(true);
    expect(confirm().textContent).toContain('Pick a skill');
    expect(document.querySelector('.freeze-step')).toBeNull();
  });

  it('a daily starts tomorrow for one day at 2 gems', async () => {
    useAccountStore().account.gems = 10;
    open();
    await flushPromises();
    await pick('Read');
    expect(document.querySelector('.freeze-start .freeze-value')!.textContent).toContain('Tomorrow');
    expect(document.querySelector('.freeze-days .freeze-value')!.textContent).toBe('1 day');
    expect(confirm().textContent).toContain('Freeze Read');
    expect(confirm().textContent).toContain('2');
  });

  it('three days of one skill cost 6, and confirming freezes only that skill', async () => {
    const accountStore = useAccountStore();
    accountStore.account.gems = 6;
    const wrapper = open();
    await flushPromises();
    await pick('Read');
    await tap('.freeze-days .more');
    await tap('.freeze-days .more');
    await tap('.ok');
    const tomorrow = addDaysToDayKey(today(), 1);
    expect(frozenOf('read')).toEqual([tomorrow, addDaysToDayKey(tomorrow, 1), addDaysToDayKey(tomorrow, 2)]);
    expect(frozenOf('hike')).toBeUndefined();
    expect(accountStore.account.gems).toBe(0);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'freeze-bought', habitName: 'Read', count: 3 });
  });

  it('a weekly freezes whole weeks from next week', async () => {
    useAccountStore().account.gems = 10;
    open();
    await flushPromises();
    await pick('Hike');
    expect(document.querySelector('.freeze-start .freeze-value')!.textContent).toContain('Next week');
    expect(document.querySelector('.freeze-days .freeze-value')!.textContent).toBe('1 week');
    await tap('.ok');
    const nextMonday = addDaysToDayKey(weekStartOf(today()), 7);
    expect(frozenOf('hike')).toHaveLength(7);
    expect(frozenOf('hike')![0]).toBe(nextMonday);
  });

  it('a weekly costs 5 gems a week', async () => {
    useAccountStore().account.gems = 20;
    open();
    await flushPromises();
    await pick('Hike');
    const price = () => document.querySelector('.ok .picker-price')!.getAttribute('aria-label');
    expect(price()).toBe('5 gems');
    await tap('.freeze-days .more');
    expect(price()).toBe('10 gems');
  });

  it('is disabled when short on gems', async () => {
    useAccountStore().account.gems = 1;
    open();
    await flushPromises();
    await pick('Read');
    expect(confirm().disabled).toBe(true);
  });

  it('days already frozen on that skill are not charged', async () => {
    useAccountStore().account.gems = 10;
    const habitStore = useHabitStore();
    habitStore.updateHabit({ ...habitStore.habits[0], frozenDayKeys: [addDaysToDayKey(today(), 1)] });
    open();
    await flushPromises();
    await pick('Read');
    expect(confirm().disabled).toBe(true);
    await tap('.freeze-days .more');
    expect(confirm().textContent).toContain('2');
    expect(confirm().disabled).toBe(false);
  });

  it('a daily starts no later than 30 days out', async () => {
    useAccountStore().account.gems = 10;
    open();
    await flushPromises();
    await pick('Read');
    expect(document.querySelector<HTMLButtonElement>('.freeze-start .less')!.disabled).toBe(true);
    for (let i = 0; i < 40; i++) await tap('.freeze-start .more');
    expect(document.querySelector<HTMLButtonElement>('.freeze-start .more')!.disabled).toBe(true);
  });
});
