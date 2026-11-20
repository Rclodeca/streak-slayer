// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expToNextLevel } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import GainPopup from './GainPopup.vue';

enableAutoUnmount(afterEach);

describe('GainPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, gold: 1540, level: 3, exp: 80 });
    useAccountStore().initFromSave({ startingGemsPaid: true, gems: 94, highestLevel: 1 }, 1);
  });
  afterEach(() => vi.useRealTimers());

  const patch = (fields: { gold?: number; level?: number; exp?: number }) => {
    const store = useCharacterStore();
    store.setCharacter({ ...store.character, ...fields });
  };

  it('shows nothing at mount', () => {
    const wrapper = mount(GainPopup);
    expect(wrapper.find('.gain-popup.show').exists()).toBe(false);
  });

  it('merges gains within 400ms into one plate', async () => {
    const wrapper = mount(GainPopup);
    patch({ gold: 1590 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(200);
    useAccountStore().addGems(3);
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.gain-popup')).toHaveLength(1);
    expect(wrapper.find('.gain-popup.show').text()).toContain('+50');
    expect(wrapper.find('.gain-popup.show').text()).toContain('+3');
  });

  it('counts EXP across a level-up', async () => {
    const wrapper = mount(GainPopup);
    patch({ level: 4, exp: 20 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    const text = wrapper.find('.gain-popup.show').text();
    expect(text).toContain(`+${expToNextLevel(3) - 80 + 20}`);
    expect(text).toContain('EXP');
  });

  it('counts the whole of every level a big gain passes', async () => {
    const wrapper = mount(GainPopup);
    patch({ level: 5, exp: 10 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.gain-popup.show').text()).toContain(`+${expToNextLevel(3) - 80 + expToNextLevel(4) + 10}`);
  });

  it('shows EXP, then gold, then gems', async () => {
    const wrapper = mount(GainPopup);
    useAccountStore().addGems(2);
    patch({ gold: 1600, exp: 90 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    const parts = wrapper.findAll('.gain-popup.show .gain-part').map((p) => p.text());
    expect(parts).toEqual(['+10 EXP', '+60', '+2']);
  });

  it('ignores spending and losses', async () => {
    const wrapper = mount(GainPopup);
    patch({ gold: 900 });
    await wrapper.vm.$nextTick();
    patch({ level: 2 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.gain-popup.show').exists()).toBe(false);
  });

  it('hides 1.9s after showing', async () => {
    const wrapper = mount(GainPopup);
    patch({ gold: 1600 });
    await wrapper.vm.$nextTick();
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.gain-popup.show').exists()).toBe(true);
    vi.advanceTimersByTime(1900);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.gain-popup.show').exists()).toBe(false);
  });
});
