// @vitest-environment jsdom

import { enableAutoUnmount, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterStore } from '../../store/characterStore';
import { useLogVisibleStore } from '../../store/logVisibleStore';
import { useTabStore } from '../../store/tabStore';
import { useTrialSeenStore } from '../../store/trialSeenStore';
import Modal from '../ui/Modal.vue';
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

  it('puts the stage on top, skills, quests and trials on the left, progress and the log on the right', () => {
    useLogVisibleStore().setOn(true);
    const wrapper = shallowMount(AppShell);
    const layout = wrapper.find('.layout');
    expect(layout.element.firstElementChild!.tagName.toLowerCase()).toBe('fight-stage-stub');
    expect(layout.find('.main habit-list-stub').exists()).toBe(true);
    expect(layout.find('.main quest-section-stub').exists()).toBe(true);
    expect(layout.find('.main trial-section-stub').exists()).toBe(true);
    expect(layout.find('tab-bar-stub').exists()).toBe(false);
    expect(layout.find('hero-details-stub').exists()).toBe(false);
    expect(layout.find('.side progress-summary-stub').exists()).toBe(true);
    expect(layout.find('.side activity-log-stub').exists()).toBe(true);
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

    it('opens the log in a popup from the menu', async () => {
      const wrapper = shallowMount(AppShell, { global: { renderStubDefaultSlot: true } });
      const logPopup = () => wrapper.findAllComponents(Modal).find((modal) => modal.props('title') === 'Log')!;
      expect(logPopup().props('modelValue')).toBe(false);
      wrapper.findComponent(AppMenu).vm.$emit('log');
      await wrapper.vm.$nextTick();
      expect(logPopup().props('modelValue')).toBe(true);
      expect(logPopup().find('activity-log-stub').attributes('bare')).toBe('true');
    });

    it('marks the trials seen once the Trials tab is open', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({
        ...characterStore.character,
        level: 5,
        questsUnlocked: true,
        challenges: [{ id: 'resist', relicId: 'ember-heart', takenDayKey: '2026-11-01', progress: 0 }],
      });
      const wrapper = shallowMount(AppShell);
      const trialSeen = useTrialSeenStore();
      expect(trialSeen.unseen(characterStore.character.challenges!)).toBe(true);

      useTabStore().select('trials');
      await wrapper.vm.$nextTick();
      expect(trialSeen.unseen(characterStore.character.challenges!)).toBe(false);
      expect(trialSeen.fresh).toEqual(['resist@2026-11-01']);

      useTabStore().select('skills');
      await wrapper.vm.$nextTick();
      expect(trialSeen.fresh).toEqual([]);
    });
  });
});
