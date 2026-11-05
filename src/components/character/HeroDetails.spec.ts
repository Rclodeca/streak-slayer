// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng, ITEM_CATALOG } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import HeroDetails from './HeroDetails.vue';

enableAutoUnmount(afterEach);

describe('HeroDetails', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useCharacterStore().character.name = 'Ash';
  });

  it('opens on the hero with their level and bars, in the popup', () => {
    const wrapper = mount(HeroDetails);
    expect(wrapper.find('.hero .hero-sprite').exists()).toBe(true);
    expect(wrapper.find('.hero .hero-level').text()).toBe(`Level ${useCharacterStore().character.level}`);
    expect(wrapper.find('.hero-page-header').exists()).toBe(false);
  });

  it('opens on the name, level and best streak as the Hero tab, with no second hero', () => {
    const habitStore = useHabitStore();
    habitStore.addHabit('Read', 'daily', 'easy', false, createRng(1)).streakCount = 4;
    habitStore.addHabit('Run', 'daily', 'easy', false, createRng(1)).streakCount = 9;
    const wrapper = mount(HeroDetails, { props: { page: true } });
    expect(wrapper.find('.hero').exists()).toBe(false);
    expect(wrapper.find('.hero-page-header h2').text()).toBe('Ash');
    const [level, streak] = wrapper.findAll('.hero-head .stat-tile');
    expect(level.find('.tile-value').text()).toBe(String(useCharacterStore().character.level));
    expect(level.find('.tile-note').text()).toContain('EXP to next');
    expect(streak.find('.tile-value').text()).toBe('9');
    expect(streak.find('.tile-note').text()).toBe('Run');
  });

  it('lists the gear and the empty slots on the tab too', () => {
    const store = useCharacterStore();
    const item = ITEM_CATALOG[0];
    store.character.ownedItemIds = [item.id];
    store.character.equippedItemIds = [item.id];
    const wrapper = mount(HeroDetails, { props: { page: true } });
    expect(wrapper.find('.gear-row .gear-name').text()).toBe(item.name);
    expect(wrapper.findAll('.gear-row.empty').length).toBeGreaterThan(0);
  });
});
