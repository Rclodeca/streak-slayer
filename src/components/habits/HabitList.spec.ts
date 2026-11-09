// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createRng, dayOfWeekIndex } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { TUNING } from '../../game-engine/constants/tuning';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useHintStore } from '../../store/hintStore';
import HabitList from './HabitList.vue';
import { WEEKDAY_SHORT } from './weekdays';

enableAutoUnmount(afterEach);

describe('HabitList', () => {
  let pinia: ReturnType<typeof createPinia>;
  const today = dayOfWeekIndex(new Date());

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function addDaily(days?: number[], overrides: Partial<Habit> = {}) {
    const habitStore = useHabitStore();
    const added = habitStore.addHabit('Gym', 'daily', 'medium', false, createRng(1), days);
    habitStore.updateHabit({ ...added, ...overrides });
    return added;
  }

  function mountList() {
    return mount(HabitList, { global: { plugins: [pinia] }, attachTo: document.body });
  }

  function names(wrapper: ReturnType<typeof mountList>, selector: string) {
    return wrapper.findAll(`${selector} .habit-item .name`).map((name) => name.text());
  }

  it('bad habits leave the skills for a Resist panel of their own', () => {
    const habitStore = useHabitStore();
    habitStore.addHabit('Run', 'daily', 'medium', false, createRng(1));
    habitStore.addHabit('Doomscroll', 'daily', 'medium', true, createRng(2));
    habitStore.addHabit('Hike', 'weekly', 'medium', false, createRng(3));
    habitStore.addHabit('Takeout', 'weekly', 'medium', true, createRng(4));
    const wrapper = mountList();
    expect(names(wrapper, '.skill-list')).toEqual(['Run', 'Hike']);
    expect(wrapper.find('.resist-list h2').text()).toBe('Resist');
    expect(names(wrapper, '.resist-list')).toEqual(['Doomscroll', 'Takeout']);
  });

  it('titles each list with a banner and no count', () => {
    useHabitStore().addHabit('Doomscroll', 'daily', 'medium', true, createRng(2));
    addDaily();
    const wrapper = mountList();
    expect(wrapper.find('.skill-list h2.section-title .cloth').text()).toBe('Skills');
    expect(wrapper.find('.resist-list h2.section-title .cloth').text()).toBe('Resist');
    expect(wrapper.find('.habit-list-header').text()).toBe('Skills');
  });

  it('draws no panel frame around Skills or Resist', () => {
    const habitStore = useHabitStore();
    habitStore.addHabit('Run', 'daily', 'medium', false, createRng(1));
    habitStore.addHabit('Doomscroll', 'daily', 'medium', true, createRng(2));
    const wrapper = mountList();
    expect(wrapper.find('.skill-list').classes()).not.toContain('panel');
    expect(wrapper.find('.resist-list').classes()).not.toContain('panel');
  });

  it('keeps Resist in view without a bad habit, saying what it is for', () => {
    addDaily();
    const wrapper = mountList();
    expect(wrapper.find('.resist-list').exists()).toBe(true);
    expect(wrapper.find('.resist-list .habit-group-caption').text()).toBe('Habits to break');
    expect(wrapper.find('.resist-list .section-empty').text()).toContain('Nothing to resist yet');
    expect(wrapper.find('.resist-list .habit-item').exists()).toBe(false);
  });

  it("Resist's own plus opens the habit popup set to Bad, and Skills' plus to Good", async () => {
    addDaily();
    const wrapper = mountList();
    const pledge = () => document.body.querySelector('.add-habit-form .pledge')!;
    await wrapper.find('.resist-list .add-button').trigger('click');
    expect(pledge().classList.contains('type-bad')).toBe(true);
    document.body.querySelector<HTMLButtonElement>('.modal-close')!.click();
    await nextTick();
    await wrapper.find('.skill-list .add-button').trigger('click');
    expect(pledge().classList.contains('type-good')).toBe(true);
  });

  it('splits bad habits into Daily and Weekly, resting ones last in Daily', () => {
    const habitStore = useHabitStore();
    habitStore.addHabit('Snacking', 'daily', 'medium', true, createRng(1), [(today + 2) % 7]);
    habitStore.addHabit('Takeout', 'weekly', 'medium', true, createRng(2));
    habitStore.addHabit('Doomscroll', 'daily', 'medium', true, createRng(3));
    const wrapper = mountList();
    expect(names(wrapper, '.resist-list')).toEqual(['Doomscroll', 'Snacking', 'Takeout']);
    const groups = wrapper.findAll('.resist-list .habit-group').map((group) => ({
      label: group.find('.habit-group-label').text(),
      names: group.findAll('.habit-item .name').map((el) => el.text()),
    }));
    expect(groups.map((g) => g.label)).toEqual(['Daily', 'Weekly']);
    expect(groups.map((g) => g.names)).toEqual([['Doomscroll', 'Snacking'], ['Takeout']]);
  });

  it('a habit resting today stays in Daily after the due ones, greyed, with its next due day', () => {
    addDaily([(today + 2) % 7]);
    const habitStore = useHabitStore();
    habitStore.addHabit('Due', 'daily', 'medium', false, createRng(2), [today]);
    const wrapper = mountList();
    expect(wrapper.find('details').exists()).toBe(false);
    expect(wrapper.findAll('.skill-list .habit-item').map((row) => row.classes().includes('resting'))).toEqual([false, true]);
    const resting = wrapper.find('.habit-item.resting');
    expect(resting.find('.next-day').text()).toBe(WEEKDAY_SHORT[(today + 2) % 7]);
    expect(resting.find('button.strike').attributes('disabled')).toBeDefined();
  });

  it('nothing is marked resting when every habit is due today', () => {
    addDaily([today]);
    const wrapper = mountList();
    expect(wrapper.find('.habit-item.resting').exists()).toBe(false);
  });

  it('resting follows the debug clock', async () => {
    addDaily([today]);
    const wrapper = mountList();
    useDebugClockStore().offsetMs = 24 * 60 * 60 * 1000;
    await nextTick();
    expect(wrapper.find('.habit-item.resting').exists()).toBe(true);
  });

  it('the popup’s Overdrive button lights its charges once the skill lands, and greys one per use', async () => {
    addDaily(undefined, { isOverdrive: true });
    const wrapper = mountList();
    const strike = wrapper.find('button.strike');
    await wrapper.find('li').trigger('click'); // opens the popup
    const charges = (state: string) => document.body.querySelectorAll(`.overdrive-button .charge.${state}`).length;

    expect(document.body.querySelectorAll('.overdrive-button .charge')).toHaveLength(TUNING.OVERDRIVE_MAX_EXTRA_USES);
    expect(charges('ready')).toBe(0);

    await strike.trigger('click');
    expect(charges('ready')).toBe(TUNING.OVERDRIVE_MAX_EXTRA_USES);

    await strike.trigger('click');
    expect(charges('used')).toBe(1);
    expect(charges('ready')).toBe(TUNING.OVERDRIVE_MAX_EXTRA_USES - 1);
  });

  it('the popup stays open when tapping today moves its row down to the resting ones', async () => {
    addDaily();
    const wrapper = mountList();
    await wrapper.find('li').trigger('click'); // opens the popup
    document.body.querySelectorAll<HTMLButtonElement>('.skill-days button.day')[today].click();
    await nextTick();
    expect(wrapper.find('.habit-item.resting').exists()).toBe(true);
    expect(document.body.querySelector('.skill-days')).not.toBeNull();
  });

  it('points a player with no habits at + New habit until they tap Later', async () => {
    const wrapper = mountList();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')?.textContent).toContain('Miss it, and the boss strikes you.');

    document.body.querySelector<HTMLButtonElement>('.hint-action')!.click();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
    expect(wrapper.find('.add-button').exists()).toBe(true);
  });

  it('tapping the lit button opens Add habit, and the hint comes back if it closes empty', async () => {
    mountList();
    await nextTick();
    document.body.querySelector<HTMLButtonElement>('.hint-hole')!.click();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
    expect(document.body.textContent).toContain('Forge a habit');

    document.body.querySelector<HTMLButtonElement>('.modal-close')!.click();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')).not.toBeNull();
  });

  it('points at the first good habit due today with a one-time "Strike it." hint', async () => {
    const habit = addDaily();
    const wrapper = mountList();
    await nextTick();
    const hint = document.body.querySelector('.spotlight-hint');
    expect(hint?.textContent).toContain('When it’s done');
    expect(hint?.textContent).toContain('Strike it.');
    const hole = document.body.querySelector<HTMLElement>('.hint-hole')!;
    expect(hole.getAttribute('aria-label')).toBe(wrapper.find('button.strike').attributes('aria-label'));
    expect(hint?.textContent).not.toContain('Start here');

    document.body.querySelector<HTMLButtonElement>('.hint-hole')!.click();
    await nextTick();
    expect(useHabitStore().habits.find((h) => h.id === habit.id)!.lastCompletedPeriodKey).not.toBeNull();
    expect(useHintStore().seen.checkGood).toBe(true);
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
  });

  it('gives a bad habit its own hint once the good one is seen, worded for giving in', async () => {
    useHintStore().markSeen('checkGood');
    addDaily(undefined, { isBad: true });
    mountList();
    await nextTick();
    const text = document.body.querySelector('.spotlight-hint')?.textContent;
    expect(text).toContain('If you give in');
    expect(text).toContain('Tap it.');
    expect(text).not.toContain('Strike it.');

    document.body.querySelector<HTMLButtonElement>('.hint-action')!.click();
    await nextTick();
    expect(useHintStore().seen.checkBad).toBe(true);
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
  });

  it('waits for a habit resting today to come due before pointing at it', async () => {
    addDaily([(today + 2) % 7]);
    mountList();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
  });

  it('shows no check-off hint to a player who has seen it', async () => {
    useHintStore().markSeen('checkGood');
    addDaily();
    mountList();
    await nextTick();
    expect(document.body.querySelector('.spotlight-hint')).toBeNull();
  });
});
