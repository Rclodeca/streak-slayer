// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useFocusModeStore } from '../../store/focusModeStore';
import AppMenu from './AppMenu.vue';

enableAutoUnmount(afterEach);

describe('AppMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('shows no Theme section while Moonlit is the only theme', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    await wrapper.find('.menu-button').trigger('click');
    const panel = wrapper.find('.menu-panel');
    expect(panel.text()).toContain('High Scores');
    expect(panel.text()).not.toContain('Theme');
    expect(panel.find('[role="menuitemradio"]').exists()).toBe(false);
  });

  it('flips Focus mode from the menu, and keeps the menu open', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    await wrapper.find('.menu-button').trigger('click');
    const item = wrapper.find('[role="menuitemcheckbox"]');
    expect(item.text()).toContain('Focus mode');
    expect(item.attributes('aria-checked')).toBe('false');

    await item.trigger('click');
    expect(useFocusModeStore().on).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
    expect(wrapper.find('.menu-panel').exists()).toBe(true);
    expect(wrapper.find('[role="menuitemcheckbox"]').attributes('aria-checked')).toBe('true');

    await wrapper.find('[role="menuitemcheckbox"]').trigger('click');
    expect(useFocusModeStore().on).toBe(false);
  });
});
