// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createRng, dailyPeriodKey, dayOfWeekIndex, formatCompact, habitDamageBreakdown } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { TUNING } from '../../game-engine/constants/tuning';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import HabitListItem from './HabitListItem.vue';

enableAutoUnmount(afterEach);

describe('HabitListItem', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  // Renders the row from the store's live copy of the habit, the way
  // HabitList does, so every combat action re-renders it.
  function mountSkill(overrides: Partial<Habit> = {}) {
    const habitStore = useHabitStore();
    const added = habitStore.addHabit('Read', 'daily', 'medium', false, createRng(1));
    habitStore.updateHabit({ ...added, ...overrides });
    const Host = defineComponent(() => () => h(HabitListItem, { habit: habitStore.habits[0] }));
    return mount(Host, { global: { plugins: [pinia] }, attachTo: document.body });
  }

  // Mounts the row itself, so its `open` emit can be watched.
  function mountRow(overrides: Partial<Habit> = {}) {
    const habitStore = useHabitStore();
    const added = habitStore.addHabit('Read', 'daily', 'medium', false, createRng(1));
    habitStore.updateHabit({ ...added, ...overrides });
    return mount(HabitListItem, { props: { habit: habitStore.habits[0] }, global: { plugins: [pinia] }, attachTo: document.body });
  }

  it('pressing the button strikes the skill and leaves the details closed', async () => {
    const wrapper = mountRow();

    await wrapper.find('button.strike').trigger('click');

    expect(useHabitStore().habits[0].lastCompletedPeriodKey).not.toBeNull();
    expect(wrapper.emitted('open')).toBeUndefined();
  });

  it('a tap on the card opens the details and strikes nothing', async () => {
    const wrapper = mountRow();

    await wrapper.find('.name').trigger('click');

    expect(wrapper.emitted('open')).toHaveLength(1);
    expect(useHabitStore().habits[0].lastCompletedPeriodKey).toBeNull();
  });

  it('once struck the button stays down and a tap on the card opens the details', async () => {
    const wrapper = mountSkill();
    await wrapper.find('button.strike').trigger('click');

    const button = wrapper.find('button.strike');
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(button.attributes('disabled')).toBeDefined();

    const row = wrapper.findComponent(HabitListItem);
    await row.find('li.habit-item').trigger('click');
    expect(row.emitted('open')).toHaveLength(1);
  });

  it('a second press on a struck Overdrive skill spends a charge and stays pressed', async () => {
    const wrapper = mountSkill({ isOverdrive: true });
    const button = wrapper.find('button.strike');

    await button.trigger('click'); // strikes the skill
    expect(button.attributes('aria-label')).toBe('Overdrive Read');
    await button.trigger('click'); // overdrives it

    expect(useHabitStore().habits[0].overdriveUsesThisPeriod).toBe(1);
    expect(button.attributes('aria-pressed')).toBe('true');
  });

  it('a struck Overdrive skill keeps its halo until its charges are spent', async () => {
    const wrapper = mountSkill({ isOverdrive: true });
    const button = wrapper.find('button.strike');
    expect(button.classes()).not.toContain('overdrive-ready');

    await button.trigger('click');
    expect(button.classes()).toContain('overdrive-ready');
    expect(button.attributes('disabled')).toBeUndefined();

    for (let i = 0; i < TUNING.OVERDRIVE_MAX_EXTRA_USES; i++) await button.trigger('click');
    expect(button.classes()).not.toContain('overdrive-ready');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('aria-label')).toBe('Complete Read');
  });

  it('shows the damage on the button with its type icon', () => {
    const wrapper = mountSkill();
    const habit = useHabitStore().habits[0];
    const damage = habitDamageBreakdown(useCharacterStore().character, habit, useHabitStore().habits, useBossStore().boss, dailyPeriodKey(new Date())).effectiveDamage;
    const button = wrapper.find('button.strike');
    expect(button.find('b').text()).toBe(formatCompact(damage));
    expect(button.findAll('.stat-icon')).toHaveLength(1);
    expect(wrapper.find('.damage').exists()).toBe(false);
  });

  it("a resting skill's button is flat and can't be pressed", () => {
    const wrapper = mountSkill({ days: [(dayOfWeekIndex(new Date()) + 2) % 7] });
    const button = wrapper.find('button.strike');
    expect(button.classes()).toContain('resting');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('aria-pressed')).toBe('false');
  });

  it("a bad habit's button is a resist button, and pressing it gives in", async () => {
    const wrapper = mountSkill({ isBad: true });
    const before = useCharacterStore().character.currentHealth;
    const button = wrapper.find('button.strike');
    expect(button.classes()).toContain('resist');

    await button.trigger('click');

    expect(useHabitStore().habits[0].lastCompletedPeriodKey).not.toBeNull();
    expect(useCharacterStore().character.currentHealth).toBeLessThan(before);
    expect(wrapper.find('.habit-item').classes()).toContain('struck');
    expect(button.attributes('aria-pressed')).toBe('true');
  });

  it("a bad habit's button says Give in, with no number on it", () => {
    const wrapper = mountSkill({ isBad: true });
    const button = wrapper.find('button.strike');
    expect(button.text()).toBe('Give in');
    expect(button.attributes('aria-label')).toBe('Give in to Read');
    expect(button.find('b').exists()).toBe(false);
  });

  it('a bad habit shows what holding out deals in a plate, not on the button', () => {
    const wrapper = mountSkill({ isBad: true });
    const habit = useHabitStore().habits[0];
    const damage = habitDamageBreakdown(useCharacterStore().character, habit, useHabitStore().habits, useBossStore().boss, dailyPeriodKey(new Date())).effectiveDamage;
    const plate = wrapper.find('.reward-plate');
    expect(plate.find('b').text()).toBe(formatCompact(damage));
    expect(plate.findAll('.stat-icon')).toHaveLength(1);
  });

  it('a good skill has no reward plate', () => {
    const wrapper = mountSkill();
    expect(wrapper.find('.reward-plate').exists()).toBe(false);
  });

  describe('struck', () => {
    it('marks the row struck once the skill lands', async () => {
      const wrapper = mountSkill();
      const row = wrapper.find('.habit-item');
      expect(row.classes()).not.toContain('struck');

      await wrapper.find('button.strike').trigger('click');

      expect(row.classes()).toContain('struck');
    });

    it('a struck Overdrive skill is struck at once, with charges left or not', async () => {
      const wrapper = mountSkill({ isOverdrive: true });
      const button = wrapper.find('button.strike');
      const row = wrapper.find('.habit-item');

      await button.trigger('click');
      expect(button.classes()).toContain('overdrive-ready');
      expect(row.classes()).toContain('struck');

      for (let i = 0; i < TUNING.OVERDRIVE_MAX_EXTRA_USES; i++) await button.trigger('click');
      expect(row.classes()).toContain('struck');
    });
  });

  describe('landing flash', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('flashes the button once when the skill lands, then lets it settle', async () => {
      vi.useFakeTimers();
      const wrapper = mountSkill();
      const button = wrapper.find('button.strike');

      await button.trigger('click');
      expect(button.classes()).toContain('lit');

      vi.advanceTimersByTime(600);
      await nextTick();
      expect(button.classes()).not.toContain('lit');
    });

    it('a skill already struck when the list opens does not flash', () => {
      const wrapper = mountSkill({ lastCompletedPeriodKey: dailyPeriodKey(new Date()) });
      expect(wrapper.find('button.strike').classes()).not.toContain('lit');
    });
  });

  describe('rank', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows one pip per rank under the name, none unranked', () => {
      const unranked = mountSkill({ rank: 0 });
      expect(unranked.find('.rank-pips').exists()).toBe(false);
      expect(unranked.find('.pips').exists()).toBe(false);
      unranked.unmount();
      setActivePinia((pinia = createPinia()));
      const ranked = mountSkill({ rank: 3 });
      expect(ranked.findAll('.title .rank-pips i')).toHaveLength(3);
      expect(ranked.find('.meta .rank-pips').exists()).toBe(false);
      expect(ranked.find('.rank-pips').attributes('aria-label')).toBe('Rank III');
    });

    it('keeps the streak one size however long it runs', () => {
      const short = mountSkill({ streakCount: 3 });
      const shortSize = (short.find('.streak').element as HTMLElement).style.fontSize;
      short.unmount();
      setActivePinia((pinia = createPinia()));
      const long = mountSkill({ streakCount: 40 });
      expect((long.find('.streak').element as HTMLElement).style.fontSize).toBe(shortSize);
    });

    it('flares the row once on a rank-up, then clears', async () => {
      vi.useFakeTimers();
      const wrapper = mountSkill({ rank: 2 });
      const habitStore = useHabitStore();
      habitStore.updateHabit({ ...habitStore.habits[0], rank: 3 });
      await nextTick();
      expect(wrapper.find('.habit-item').classes()).toContain('flare');
      expect(wrapper.find('.rank-ghost').text()).toBe('Rank III');
      vi.advanceTimersByTime(2400);
      await nextTick();
      expect(wrapper.find('.habit-item').classes()).not.toContain('flare');
      expect(wrapper.find('.rank-ghost').exists()).toBe(false);
    });

    it('plays nothing on a streak-only change or when mounted ranked', async () => {
      const wrapper = mountSkill({ rank: 5, streakCount: 60 });
      expect(wrapper.find('.habit-item').classes()).not.toContain('flare');
      const habitStore = useHabitStore();
      habitStore.updateHabit({ ...habitStore.habits[0], streakCount: 61 });
      await nextTick();
      expect(wrapper.find('.habit-item').classes()).not.toContain('flare');
    });
  });
});
