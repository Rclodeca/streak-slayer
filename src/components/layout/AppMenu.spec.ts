// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
