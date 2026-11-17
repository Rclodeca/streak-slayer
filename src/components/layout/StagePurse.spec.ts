// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StagePurse from './StagePurse.vue';

enableAutoUnmount(afterEach);

describe('StagePurse', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 1540 });
    useAccountStore().initFromSave({ gems: 94, highestLevel: 1 }, 1);
  });
  afterEach(() => vi.useRealTimers());

  const setGold = (gold: number) => {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, gold });
  };

  it('shows the gold and gems on one plate, in full', () => {
    const wrapper = mount(StagePurse);
    const counts = wrapper.findAll('.purse-plate .purse-count').map((c) => c.text());
    expect(counts).toEqual(['1,540', '94']);
    expect(wrapper.find('.purse-plate').attributes('aria-label')).toBe('1,540 gold, 94 gems');
  });

  it('shows no plate where there is no room (the Focus strip)', () => {
    expect(mount(StagePurse, { props: { plate: false } }).find('.purse-plate').exists()).toBe(false);
  });

  it('shows a gain for a moment, but nothing for the first value or for spending', async () => {
    vi.useFakeTimers();
    const wrapper = mount(StagePurse);
    expect(wrapper.find('.purse-gain').exists()).toBe(false);
    setGold(1660);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.purse-gain').text()).toBe('+120');
    vi.advanceTimersByTime(1600);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.purse-gain').exists()).toBe(false);
    setGold(1500);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.purse-gain').exists()).toBe(false);
  });

  it('shows gem gains too, even with no plate', async () => {
    const wrapper = mount(StagePurse, { props: { plate: false } });
    useAccountStore().addGems(5);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.purse-gain').text()).toBe('+5');
  });
});
