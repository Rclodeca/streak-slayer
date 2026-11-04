// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, useFocusModeStore } from '../../store/focusModeStore';
import { useLogVisibleStore } from '../../store/logVisibleStore';
import { STORAGE_KEY as THEME_KEY, useThemeStore } from '../../store/themeStore';
import AppMenu from './AppMenu.vue';

enableAutoUnmount(afterEach);

describe('AppMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('lists the themes and swaps between them, keeping the menu open', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    await wrapper.find('.menu-button').trigger('click');
    const panel = document.body.querySelector('.menu-panel')!;
    expect(panel.textContent).toContain('High Scores');
    expect(panel.textContent).toContain('Theme');
    const options = () => [...panel.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    expect(options().map((o) => o.textContent?.trim())).toEqual(['System', 'Light', 'Dark']);
    expect(options().map((o) => o.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);

    options()[1].click(); // Light
    await wrapper.vm.$nextTick();
    expect(useThemeStore().theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.body.querySelector('.menu-panel')).not.toBeNull();
    expect(options().map((o) => o.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);

    options()[0].click(); // System
    await wrapper.vm.$nextTick();
    expect(useThemeStore().preference).toBe('system');
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
    expect(options().map((o) => o.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('flips Focus mode from the menu, and keeps the menu open', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    await wrapper.find('.menu-button').trigger('click');
    const item = () => document.body.querySelector('[role="menuitemcheckbox"]') as HTMLElement;
    expect(item().textContent).toContain('Focus mode');
    expect(item().getAttribute('aria-checked')).toBe('false');

    item().click();
    await wrapper.vm.$nextTick();
    expect(useFocusModeStore().on).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('on');
    expect(document.body.querySelector('.menu-panel')).not.toBeNull();
    expect(item().getAttribute('aria-checked')).toBe('true');

    item().click();
    expect(useFocusModeStore().on).toBe(false);
  });

  it('shows and hides the log from the menu, and keeps the menu open', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    await wrapper.find('.menu-button').trigger('click');
    const item = () =>
      [...document.body.querySelectorAll('[role="menuitemcheckbox"]')].find((el) => el.textContent?.includes('Show log')) as HTMLElement;
    expect(item().getAttribute('aria-checked')).toBe('false');

    item().click();
    await wrapper.vm.$nextTick();
    expect(useLogVisibleStore().on).toBe(true);
    expect(document.body.querySelector('.menu-panel')).not.toBeNull();
    expect(item().getAttribute('aria-checked')).toBe('true');

    item().click();
    expect(useLogVisibleStore().on).toBe(false);
  });

  it('closes on a tap outside and swallows it, so what was tapped does nothing', async () => {
    const wrapper = mount(AppMenu, { attachTo: document.body });
    const outside = document.createElement('button');
    let taps = 0;
    outside.addEventListener('click', () => taps++);
    document.body.appendChild(outside);

    await wrapper.find('.menu-button').trigger('click');
    expect(document.body.querySelector('.menu-panel')).not.toBeNull();

    outside.click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.menu-panel')).toBeNull();
    expect(taps).toBe(0);

    outside.click();
    expect(taps).toBe(1);
    outside.remove();
  });
});
