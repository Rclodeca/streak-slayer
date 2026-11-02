// @vitest-environment jsdom

import { enableAutoUnmount, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCharacterStore } from '../../store/characterStore';
import { useLogVisibleStore } from '../../store/logVisibleStore';
import AppShell from './AppShell.vue';

enableAutoUnmount(afterEach);

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useCharacterStore().character.name = 'Ash';
  });

  it('puts the stage on top, skills and quests on the left, progress and the log on the right', () => {
    useLogVisibleStore().setOn(true);
    const wrapper = shallowMount(AppShell);
    const layout = wrapper.find('.layout');
    expect(layout.element.firstElementChild!.tagName.toLowerCase()).toBe('fight-stage-stub');
    expect(layout.find('.main habit-list-stub').exists()).toBe(true);
    expect(layout.find('.main quest-section-stub').exists()).toBe(true);
    expect(layout.find('.side progress-summary-stub').exists()).toBe(true);
    expect(layout.find('.side activity-log-stub').exists()).toBe(true);
  });

  it('hides the log until it is switched on', () => {
    const wrapper = shallowMount(AppShell);
    expect(wrapper.find('activity-log-stub').exists()).toBe(false);
  });

  it('hangs the menu on the stage, with no top bar, while the fight shows', () => {
    const wrapper = shallowMount(AppShell, { global: { renderStubDefaultSlot: true } });
    expect(wrapper.find('.progress-bar').exists()).toBe(false);
    expect(wrapper.find('fight-stage-stub app-menu-stub').exists()).toBe(true);
  });

  it('puts the lists in their own scroll box beside the stage, so phones scroll only them', () => {
    const wrapper = shallowMount(AppShell);
    const body = wrapper.find('.layout > .scroll-body');
    expect(body.find('.main').exists()).toBe(true);
    expect(body.find('.side').exists()).toBe(true);
    expect(body.find('fight-stage-stub').exists()).toBe(false);
  });
});
