// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addDaysToDayKey, dailyPeriodKey, frozenDays } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useActivityLogStore } from '../../store/activityLogStore';
import FreezePicker from './FreezePicker.vue';

enableAutoUnmount(afterEach);

describe('FreezePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const today = () => dailyPeriodKey(new Date());
  const open = () => mount(FreezePicker, { props: { modelValue: true }, attachTo: document.body });
  const confirm = () => document.querySelector<HTMLButtonElement>('.ok')!;
  const tap = async (selector: string) => {
    document.querySelector<HTMLButtonElement>(selector)!.click();
    await flushPromises();
  };

  it('starts tomorrow for one day at 2 gems', async () => {
    useAccountStore().addGems(10);
    open();
    await flushPromises();
    expect(document.querySelector('.freeze-start .freeze-value')!.textContent).toContain('Tomorrow');
    expect(document.querySelector('.freeze-days .freeze-value')!.textContent).toBe('1 day');
    expect(confirm().textContent).toContain('2');
  });

  it('three days cost 6, and confirming freezes them and closes', async () => {
    const accountStore = useAccountStore();
    accountStore.addGems(6);
    const wrapper = open();
    await flushPromises();
    await tap('.freeze-days .more');
    await tap('.freeze-days .more');
    expect(confirm().textContent).toContain('6');
    await tap('.ok');
    const tomorrow = addDaysToDayKey(today(), 1);
    expect(frozenDays(accountStore.account)).toEqual([tomorrow, addDaysToDayKey(tomorrow, 1), addDaysToDayKey(tomorrow, 2)]);
    expect(accountStore.account.gems).toBe(0);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'freeze-bought', fromDayKey: tomorrow, days: 3, gems: 6 });
  });

  it('is disabled when short on gems', async () => {
    useAccountStore().addGems(1);
    open();
    await flushPromises();
    expect(confirm().disabled).toBe(true);
  });

  it('days already frozen are not charged', async () => {
    const accountStore = useAccountStore();
    accountStore.account = { ...accountStore.account, gems: 10, frozenDayKeys: [addDaysToDayKey(today(), 1)] };
    open();
    await flushPromises();
    expect(confirm().disabled).toBe(true);
    await tap('.freeze-days .more');
    expect(confirm().textContent).toContain('2');
    expect(confirm().disabled).toBe(false);
  });

  it('can start no sooner than tomorrow and no later than 30 days out', async () => {
    useAccountStore().addGems(10);
    open();
    await flushPromises();
    expect(document.querySelector<HTMLButtonElement>('.freeze-start .less')!.disabled).toBe(true);
    for (let i = 0; i < 40; i++) await tap('.freeze-start .more');
    expect(document.querySelector<HTMLButtonElement>('.freeze-start .more')!.disabled).toBe(true);
  });
});
