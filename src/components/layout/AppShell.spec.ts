// @vitest-environment jsdom

import { enableAutoUnmount, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterStore } from '../../store/characterStore';
import { useLogVisibleStore } from '../../store/logVisibleStore';
import { useTabStore } from '../../store/tabStore';
import Modal from '../ui/Modal.vue';
import TrialsModal from '../quests/TrialsModal.vue';
import AppMenu from './AppMenu.vue';
import AppShell from './AppShell.vue';

enableAutoUnmount(afterEach);

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    useCharacterStore().character.name = 'Ash';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The phone layout (usePhoneLayout) is the 820px media query.
  const stubPhone = () => vi.stubGlobal('matchMedia', (media: string) => ({ matches: true, media, addEventListener() {}, removeEventListener() {} }));

  it('puts the stage on top, skills and quests on the left, progress and the log on the right', () => {
    useLogVisibleStore().setOn(true);
    const wrapper = shallowMount(AppShell);
    const layout = wrapper.find('.layout');
    expect(layout.element.firstElementChild!.tagName.toLowerCase()).toBe('fight-stage-stub');
    expect(layout.find('.main habit-list-stub').exists()).toBe(true);
    expect(layout.find('.main quest-section-stub').exists()).toBe(true);
    expect(layout.find('.main trials-modal-stub').exists()).toBe(false);
    expect(layout.find('tab-bar-stub').exists()).toBe(false);
    expect(layout.find('hero-details-stub').exists()).toBe(false);
    expect(layout.find('.side progress-summary-stub').exists()).toBe(true);
    expect(layout.find('.side activity-log-stub').exists()).toBe(true);
  });

  it('lists Trials in the menu on wider screens, and opens them as a modal', async () => {
    const wrapper = shallowMount(AppShell, { global: { stubs: { FightStage: { template: '<div class="stage-slot"><slot /></div>' } } } });
    const menu = wrapper.findComponent(AppMenu);
    expect(menu.props('trialsItem')).toBe(true);
    expect(wrapper.find('.stage-trials').exists()).toBe(false);
    menu.vm.$emit('trials');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(TrialsModal).props('modelValue')).toBe(true);
  });

  it('puts Talents on the right under the progress boxes and above the log, not in the lists', () => {
    useLogVisibleStore().setOn(true);
    const wrapper = shallowMount(AppShell);
    const side = wrapper.find('.side');
    expect(side.find('talent-section-stub').exists()).toBe(true);
    expect(wrapper.find('.main talent-section-stub').exists()).toBe(false);
    const order = [...side.element.children].map((el) => el.tagName.toLowerCase());
    expect(order.indexOf('progress-summary-stub')).toBeLessThan(order.indexOf('talent-section-stub'));
    expect(order.indexOf('talent-section-stub')).toBeLessThan(order.indexOf('activity-log-stub'));
  });

  it('puts the Shop on the right under Talents', () => {
    const side = shallowMount(AppShell).find('.side');
    const html = side.html();
    expect(html.indexOf('shop-section-stub')).toBeGreaterThan(html.indexOf('talent-section-stub'));
  });

  it('hides the log until it is switched on', () => {
    const wrapper = shallowMount(AppShell);
    expect(wrapper.find('activity-log-stub').exists()).toBe(false);
    expect(wrapper.find('.side .log-end').exists()).toBe(true);
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

  describe('on a phone', () => {
    beforeEach(stubPhone);

    it('shows one tab at a time over the bottom bar, opening on Skills', async () => {
      const wrapper = shallowMount(AppShell);
      expect(wrapper.find('.layout > .scroll-body + tab-bar-stub').exists()).toBe(true);
      const current = () => wrapper.findAll('.tab-panel.current');
      expect(current()).toHaveLength(1);
      expect(current()[0].find('habit-list-stub').exists()).toBe(true);

      useTabStore().select('hero');
      await wrapper.vm.$nextTick();
      expect(current()[0].find('hero-details-stub').attributes('page')).toBe('true');
    });

    it('pins the home base over the lists on the Hero tab, in the fight stage\'s place', async () => {
      const wrapper = shallowMount(AppShell);
      expect(wrapper.find('.layout > fight-stage-stub').exists()).toBe(true);
      expect(wrapper.find('home-base-stub').exists()).toBe(false);

      useTabStore().select('hero');
      await wrapper.vm.$nextTick();
      const layout = wrapper.find('.layout');
      expect(layout.element.firstElementChild!.tagName.toLowerCase()).toBe('home-base-stub');
      expect(layout.find('fight-stage-stub').exists()).toBe(false);

      useTabStore().select('skills');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.layout > fight-stage-stub').exists()).toBe(true);
      expect(wrapper.find('home-base-stub').exists()).toBe(false);
    });

    it('keeps the Trials button under the menu on the home base, from level 1', async () => {
      const homeBase = { template: '<div class="home-base-slot"><slot /></div>' };
      const mountHero = () => {
        useTabStore().select('hero');
        return shallowMount(AppShell, { global: { stubs: { HomeBase: homeBase } } });
      };
      const wrapper = mountHero();
      await wrapper.vm.$nextTick();
      const button = wrapper.find('.home-base-slot .stage-trials');
      expect(button.exists()).toBe(true);
      expect(wrapper.findComponent(AppMenu).props('trialsItem')).toBe(false);

      expect(wrapper.findComponent(TrialsModal).props('modelValue')).toBe(false);
      await button.trigger('click');
      expect(wrapper.findComponent(TrialsModal).props('modelValue')).toBe(true);
      expect(useTabStore().tab).toBe('hero');
    });

    it('pins the shop scene on the Shop tab, with the menu and the Trials button', async () => {
      const shopScene = { template: '<div class="shop-scene-slot"><slot /></div>' };
      useTabStore().select('shop');
      const wrapper = shallowMount(AppShell, { global: { stubs: { ShopScene: shopScene } } });
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.layout > .shop-scene-slot').exists()).toBe(true);
      expect(wrapper.find('fight-stage-stub').exists()).toBe(false);
      expect(wrapper.find('.shop-scene-slot app-menu-stub').exists()).toBe(true);
      const current = wrapper.findAll('.tab-panel.current');
      expect(current).toHaveLength(1);
      expect(current[0].find('shop-section-stub').exists()).toBe(true);

      await wrapper.find('.shop-scene-slot .stage-trials').trigger('click');
      expect(wrapper.findComponent(TrialsModal).props('modelValue')).toBe(true);
      expect(useTabStore().tab).toBe('shop');
    });

    it('the stage Trials button counts the claims waiting', async () => {
      const homeBase = { template: '<div class="home-base-slot"><slot /></div>' };
      const entry = { id: 'resisted' as const, takenDayKey: '2026-11-01', count: 0 };
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 5, trials: [entry] });
      useTabStore().select('hero');
      const wrapper = shallowMount(AppShell, { global: { stubs: { HomeBase: homeBase } } });
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.stage-trials .trials-count').exists()).toBe(false);

      characterStore.setCharacter({
        ...characterStore.character,
        trials: [entry, { id: 'ranks', takenDayKey: '2026-11-01', count: 1 }],
      });
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.stage-trials .trials-count').text()).toBe('1');
      expect(wrapper.find('.stage-trials .trials-pip').exists()).toBe(false);
    });

    it('fills the screen on Talents: no stage or home base, just the menu\'s corner', async () => {
      const wrapper = shallowMount(AppShell);
      useTabStore().select('talents');
      await wrapper.vm.$nextTick();
      const layout = wrapper.find('.layout');
      expect(layout.classes()).toContain('talents-full');
      expect(layout.find('fight-stage-stub').exists()).toBe(false);
      expect(layout.find('home-base-stub').exists()).toBe(false);
      expect(layout.element.firstElementChild!.tagName.toLowerCase()).toBe('menu-corner-stub');

      useTabStore().select('skills');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.layout').classes()).not.toContain('talents-full');
      expect(wrapper.find('.layout > fight-stage-stub').exists()).toBe(true);
      expect(wrapper.find('menu-corner-stub').exists()).toBe(false);
    });

    it('keeps the menu and the Trials button on Talents (Trials not listed in the menu)', async () => {
      const wrapper = shallowMount(AppShell, { global: { renderStubDefaultSlot: true } });
      useTabStore().select('talents');
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.stage-trials').exists()).toBe(true);
      expect(wrapper.findComponent(AppMenu).props('trialsItem')).toBe(false);
    });

    it('gives Talents a tab of its own, and none on the right', async () => {
      const wrapper = shallowMount(AppShell);
      expect(wrapper.find('.side talent-section-stub').exists()).toBe(false);
      useTabStore().select('talents');
      await wrapper.vm.$nextTick();
      const current = wrapper.findAll('.tab-panel.current');
      expect(current).toHaveLength(1);
      expect(current[0].find('talent-section-stub').exists()).toBe(true);
    });

    it('opens the log in a popup from the menu', async () => {
      const wrapper = shallowMount(AppShell, { global: { renderStubDefaultSlot: true } });
      const logPopup = () => wrapper.findAllComponents(Modal).find((modal) => modal.props('title') === 'Log')!;
      expect(logPopup().props('modelValue')).toBe(false);
      wrapper.findComponent(AppMenu).vm.$emit('log');
      await wrapper.vm.$nextTick();
      expect(logPopup().props('modelValue')).toBe(true);
      expect(logPopup().find('activity-log-stub').attributes('bare')).toBe('true');
    });
  });
});
