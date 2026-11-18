// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDaysToDayKey, createHabit, createRng, dailyPeriodKey, periodKeyFor, weekDayKeys } from '../../game-engine';
import type { TrialEntry } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useQuestStore } from '../../store/questStore';
import { useTabStore } from '../../store/tabStore';
import { useShopNews } from '../../composables/useShopNews';
import TabBar from './TabBar.vue';

enableAutoUnmount(afterEach);


describe('TabBar', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const tab = (wrapper: ReturnType<typeof mount>, id: string) => wrapper.find(`.tab-${id}`);
  const entry = (id: TrialEntry['id']): TrialEntry => ({ id, takenDayKey: '2026-11-01', count: 0 });

  function unseal(trials?: TrialEntry[]) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, trials });
  }

  it('opens on Skills and switches tabs', async () => {
    const wrapper = mount(TabBar);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.find('.tab-label').text())).toEqual(['Habits', 'Tasks', 'Shop', 'Talents', 'Hero']);
    expect(tab(wrapper, 'skills').attributes('aria-selected')).toBe('true');

    await tab(wrapper, 'hero').trigger('click');
    expect(useTabStore().tab).toBe('hero');
    expect(tab(wrapper, 'hero').classes()).toContain('selected');
    expect(tab(wrapper, 'skills').attributes('aria-selected')).toBe('false');
  });

  it('counts the quests due today or overdue, not the later or done ones', () => {
    unseal();
    const questStore = useQuestStore();
    const today = dailyPeriodKey(useDebugClockStore().now());
    questStore.addQuest('Today', 'easy', today);
    questStore.addQuest('Late', 'easy', addDaysToDayKey(today, -1));
    questStore.addQuest('Later', 'easy', addDaysToDayKey(today, 2));
    questStore.addQuest('Done', 'easy', today);
    questStore.quests[3].doneDayKey = today;
    expect(tab(mount(TabBar), 'quests').find('.tab-count').text()).toBe('2');
  });

  it('greys Talents out under a lock before level 5, with no badge', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 4 });
    const talents = tab(mount(TabBar), 'talents');
    expect(talents.classes()).toContain('sealed');
    expect(talents.find('.tab-lock').exists()).toBe(true);
    expect(talents.find('.tab-count').exists()).toBe(false);
  });

  it('puts a pip on Talents while the next rank is affordable on an open node, with no number', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, gold: 19 });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'talents').classes()).not.toContain('sealed');
    expect(tab(wrapper, 'talents').find('.tab-pip').exists()).toBe(false);

    characterStore.setCharacter({ ...characterStore.character, gold: 20 }); // half a kill at boss 1, ×0.8
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'talents').find('.tab-pip').exists()).toBe(true);
    expect(tab(wrapper, 'talents').find('.tab-count').exists()).toBe(false);

    // The 4th rank needs a gem the account doesn't have.
    useAccountStore().account.gems = 0;
    characterStore.setCharacter({ ...characterStore.character, gold: 5000, talents: { might: 3 } });
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'talents').find('.tab-pip').exists()).toBe(false);
  });

  it('greys Quests out under a lock while sealed, with no badges, and does not open it', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, trials: [entry('resisted')] });
    useQuestStore().addQuest('Today', 'easy', dailyPeriodKey(useDebugClockStore().now()));
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'quests').classes()).toContain('sealed');
    expect(tab(wrapper, 'quests').find('.tab-lock').exists()).toBe(true);
    expect(wrapper.find('.tab-count').exists()).toBe(false);
    expect(wrapper.find('.tab-pip').exists()).toBe(false);
    expect(tab(wrapper, 'skills').classes()).not.toContain('sealed');

    await tab(wrapper, 'quests').trigger('click');
    expect(useTabStore().tab).toBe('skills');
  });

  it('does not open any sealed tab on a tap, and says so to assistive tech', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 1 });
    const wrapper = mount(TabBar);
    for (const id of ['quests', 'shop', 'talents']) {
      expect(tab(wrapper, id).attributes('disabled')).toBeDefined();
      await tab(wrapper, id).trigger('click');
      expect(useTabStore().tab).toBe('skills');
    }
    expect(tab(wrapper, 'skills').attributes('disabled')).toBeUndefined();
    expect(tab(wrapper, 'hero').attributes('disabled')).toBeUndefined();
  });

  it('seals the Shop before level 7, with no dot, and opens it from there', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 6 });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'shop').classes()).toContain('sealed');
    expect(tab(wrapper, 'shop').find('.tab-new').exists()).toBe(false);
    characterStore.setCharacter({ ...characterStore.character, level: 7 });
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'shop').classes()).not.toContain('sealed');
    await tab(wrapper, 'shop').trigger('click');
    expect(useTabStore().tab).toBe('shop');
  });

  it('keeps the Shop open below level 7 once it has been unlocked, as after a death or prestige', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 1, shopUnlocked: true });
    expect(tab(mount(TabBar), 'shop').classes()).not.toContain('sealed');
  });

  it('opens a tab again once it unseals', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'talents').attributes('disabled')).toBeUndefined();
    await tab(wrapper, 'talents').trigger('click');
    expect(useTabStore().tab).toBe('talents');
  });

  it('drops back to Skills when the tab on show seals, as a death does', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 6, questsUnlocked: true });
    const wrapper = mount(TabBar);
    await tab(wrapper, 'talents').trigger('click');
    expect(useTabStore().tab).toBe('talents');

    characterStore.setCharacter({ ...characterStore.character, level: 1, questsUnlocked: false, talentsUnlocked: false });
    await wrapper.vm.$nextTick();
    expect(useTabStore().tab).toBe('skills');
  });

  describe('the Skills count', () => {
    const WEDNESDAY = new Date('2026-11-11T20:00:00Z');
    const SUNDAY = new Date('2026-11-15T20:00:00Z');

    function addHabits(now: Date) {
      const rng = createRng();
      const habitStore = useHabitStore();
      const done = { ...createHabit('Read', 'daily', 'easy', false, rng), lastCompletedPeriodKey: periodKeyFor('daily', now) };
      habitStore.habits = [
        createHabit('Meditate', 'daily', 'medium', false, rng),
        createHabit('Stretch', 'daily', 'easy', false, rng),
        done,
        createHabit('Skip dessert', 'daily', 'easy', true, rng),
        createHabit('Long run', 'weekly', 'hard', false, rng),
        { ...createHabit('Clean', 'weekly', 'hard', false, rng), lastCompletedPeriodKey: periodKeyFor('weekly', now) },
      ];
    }

    afterEach(() => vi.useRealTimers());

    it('counts the unchecked dailies, leaving out the bad ones, the checked ones and the weeklies before Sunday', () => {
      vi.useFakeTimers({ now: WEDNESDAY });
      addHabits(WEDNESDAY);
      expect(tab(mount(TabBar), 'skills').find('.tab-count').text()).toBe('2');
    });

    it('adds the unchecked weeklies on a Sunday', () => {
      vi.useFakeTimers({ now: SUNDAY });
      addHabits(SUNDAY);
      expect(tab(mount(TabBar), 'skills').find('.tab-count').text()).toBe('3');
    });

    it('leaves out a frozen skill', () => {
      vi.useFakeTimers({ now: SUNDAY });
      addHabits(SUNDAY);
      const habitStore = useHabitStore();
      habitStore.habits = habitStore.habits.map((h) => (h.name === 'Meditate' || h.name === 'Long run' ? { ...h, frozenDayKeys: weekDayKeys(SUNDAY) } : h));
      expect(tab(mount(TabBar), 'skills').find('.tab-count').text()).toBe('1');
    });

    it('leaves out a skill resting today and wears no count when nothing is left', () => {
      vi.useFakeTimers({ now: WEDNESDAY });
      const rng = createRng();
      const resting = createHabit('Lift', 'daily', 'medium', false, rng, [0, 1, 3, 4, 5, 6]);
      useHabitStore().habits = [resting];
      expect(tab(mount(TabBar), 'skills').find('.tab-count').exists()).toBe(false);
    });
  });

  describe('the Shop dot', () => {
    const dot = (wrapper: ReturnType<typeof mount>) => tab(wrapper, 'shop').find('.tab-new');
    /** Every side seen, as of today. */
    const seeAll = () => {
      const news = useShopNews();
      (['items', 'services', 'vault'] as const).forEach((side) => news.see(side));
    };

    beforeEach(() => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 10 });
    });

    it('shows for a new player, and goes once Items, Services and Looks have been seen', async () => {
      const wrapper = mount(TabBar);
      expect(dot(wrapper).exists()).toBe(true);
      seeAll();
      await wrapper.vm.$nextTick();
      expect(dot(wrapper).exists()).toBe(false);
    });

    it('comes back when the day turns', async () => {
      const wrapper = mount(TabBar);
      seeAll();
      await wrapper.vm.$nextTick();
      useDebugClockStore().skipToNextDay();
      await wrapper.vm.$nextTick();
      expect(dot(wrapper).exists()).toBe(true);
    });
  });
});
