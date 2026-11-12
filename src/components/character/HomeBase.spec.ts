// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng, heroClassFor } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import HomeBase from './HomeBase.vue';

enableAutoUnmount(afterEach);

describe('HomeBase', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useCharacterStore().character.name = 'Ash';
  });

  it('draws the armory with the hero stood on it', () => {
    const wrapper = mount(HomeBase);
    expect(wrapper.find('img.home-room').attributes('src')).toContain('sprites/home/armory.png');
    expect(wrapper.find('img.home-hero').attributes('src')).toContain(`sprites/player/${heroClassFor(useCharacterStore().character)}.png`);
  });

  it('shows the name, level and best streak on plates', () => {
    const habitStore = useHabitStore();
    habitStore.addHabit('Read', 'daily', 'easy', false, createRng(1)).streakCount = 4;
    habitStore.addHabit('Run', 'daily', 'easy', false, createRng(1)).streakCount = 9;
    const wrapper = mount(HomeBase);
    expect(wrapper.find('.home-name').text()).toBe('Ash');
    expect(wrapper.find('.home-stat.level .home-value').text()).toBe(String(useCharacterStore().character.level));
    expect(wrapper.find('.home-stat.streak .home-value').text()).toBe('9');
    expect(wrapper.find('.home-stat.streak').attributes('aria-label')).toBe('Best streak 9, Run');
  });

  it('names the streak without a skill when nothing is running', () => {
    const wrapper = mount(HomeBase);
    expect(wrapper.find('.home-stat.streak .home-value').text()).toBe('0');
    expect(wrapper.find('.home-stat.streak').attributes('aria-label')).toBe('Best streak 0');
  });

  it('carries the page menu in its corner', () => {
    const wrapper = mount(HomeBase, { slots: { default: '<button class="menu">Menu</button>' } });
    expect(wrapper.find('.stage-menu .menu').exists()).toBe(true);
  });
});
