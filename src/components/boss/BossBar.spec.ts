// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import BossBar from './BossBar.vue';

enableAutoUnmount(afterEach);

describe('BossBar', () => {
  const props = {
    sprite: 'bosses/brute3x',
    name: 'Raging Berserker',
    bossIndex: 9,
    current: 431.4,
    max: 604.3,
    heroClass: 'warrior' as const,
    heroName: 'Ryn',
    heroCurrent: 980,
    heroMax: 1232,
    heroLevel: 4,
    heroExp: 40,
    heroExpMax: 100,
    shown: false,
  };

  it('mirrors breakpoint marks, since its bar drains toward the portrait on the right', () => {
    const wrapper = mount(BossBar, { props: { ...props, marks: [{ at: 0.75, state: 'armed' as const }] } });
    expect(wrapper.find('.health-bar-mark').attributes('style')).toContain('left: 25%');
  });

  it("shows the boss's number and name, and its rounded HP numbers in its bar", () => {
    const wrapper = mount(BossBar, { props });
    expect(wrapper.find('.boss-number').text()).toBe('#9');
    expect(wrapper.find('.boss-side .who-name').text()).toBe('Raging Berserker');
    expect(wrapper.find('.boss-side .health-bar-label').text()).toBe('431 / 604');
  });

  it("shows the hero's name, level, HP numbers and EXP beside the boss's bar", () => {
    const wrapper = mount(BossBar, { props });
    expect(wrapper.find('.hero-side .who-name').text()).toBe('Ryn');
    expect(wrapper.find('.hero-side .level').text()).toBe('4');
    expect(wrapper.find('.hero-side .health-bar-label').text()).toBe('980 / 1.23K');
    expect(wrapper.find('.hero-side .exp-bar-fill').attributes('style')).toContain('width: 40%');
  });

  it("puts 'Slain' in the boss's name's place while it dies", async () => {
    const wrapper = mount(BossBar, { props });
    expect(wrapper.find('.bar-slain').exists()).toBe(false);
    await wrapper.setProps({ phase: 'dying' });
    expect(wrapper.find('.bar-slain').text()).toBe('Slain');
    expect(wrapper.find('.boss-side .who-name').exists()).toBe(false);
  });

  it('stays parked and inert until shown', async () => {
    const wrapper = mount(BossBar, { props });
    expect(wrapper.classes()).not.toContain('shown');
    expect(wrapper.attributes('inert')).toBeDefined();

    await wrapper.setProps({ shown: true });
    expect(wrapper.classes()).toContain('shown');
    expect(wrapper.attributes('inert')).toBeUndefined();
  });

  it('is plain status, not a button', async () => {
    const wrapper = mount(BossBar, { props: { ...props, shown: true } });
    expect(wrapper.element.tagName).toBe('DIV');
    await wrapper.trigger('click');
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it('pops each hit the boss takes', async () => {
    const wrapper = mount(BossBar, { props: { ...props, shown: true } });
    await wrapper.setProps({ current: 331.4 });
    expect(wrapper.find('.boss-side .damage-popup').text()).toBe('-100');
  });

  it('warns once the hero drops below a quarter of their HP', async () => {
    const wrapper = mount(BossBar, { props: { ...props, heroCurrent: 308 } });
    expect(wrapper.find('.hero-side').classes()).not.toContain('low');

    await wrapper.setProps({ heroCurrent: 307 });
    expect(wrapper.find('.hero-side').classes()).toContain('low');
  });

  it('pops each hit the hero takes at their bar', async () => {
    const wrapper = mount(BossBar, { props: { ...props, shown: true } });
    await wrapper.setProps({ heroCurrent: 917 });
    expect(wrapper.find('.hero-side .damage-popup').text()).toBe('-63');
    expect(wrapper.find('.boss-side .damage-popup').exists()).toBe(false);
  });
});
