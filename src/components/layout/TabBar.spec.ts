// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeChallenges, addDaysToDayKey, createHabit, createRng, dailyPeriodKey, periodKeyFor } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useHabitStore } from '../../store/habitStore';
import { useQuestStore } from '../../store/questStore';
import { useTabStore } from '../../store/tabStore';
import { useTrialSeenStore } from '../../store/trialSeenStore';
import TabBar from './TabBar.vue';

enableAutoUnmount(afterEach);

describe('TabBar', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const tab = (wrapper: ReturnType<typeof mount>, id: string) => wrapper.find(`.tab-${id}`);
  const entry = (id: ChallengeEntry['id']): ChallengeEntry => ({ id, relicId: 'ember-heart', takenDayKey: '2026-11-01', progress: 0 });

  function unseal(challenges?: ChallengeEntry[]) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, challenges });
  }

  it('opens on Skills and switches tabs', async () => {
    const wrapper = mount(TabBar);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.find('.tab-label').text())).toEqual(['Skills', 'Quests', 'Trials', 'Talents', 'Hero']);
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

  it('counts the unspent talent points on Talents from level 5, and drops the count at 0', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5 });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'talents').classes()).not.toContain('sealed');
    expect(tab(wrapper, 'talents').find('.tab-count').text()).toBe('4');

    characterStore.spendTalent('might');
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'talents').find('.tab-count').text()).toBe('3');

    characterStore.setCharacter({ ...characterStore.character, talents: { might: 3, precision: 1 } });
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'talents').find('.tab-count').exists()).toBe(false);
  });

  it('puts a pip on Trials while a new trial waits unseen', async () => {
    unseal([entry('resist')]);
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'trials').find('.tab-pip').exists()).toBe(true);

    useTrialSeenStore().visit(activeChallenges(useCharacterStore().character));
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'trials').find('.tab-pip').exists()).toBe(false);
  });

  it('counts the finished trials waiting to be claimed on Trials, even while on that tab, and it outranks the new-trial pip', async () => {
    const ready = (id: ChallengeEntry['id']): ChallengeEntry => ({ ...entry(id), progress: 1, doneDayKey: '2026-11-02', unclaimed: true });
    unseal([entry('resist'), ready('rank-up'), ready('enchant'), { ...entry('epic-find'), progress: 1, doneDayKey: '2026-11-02' }]);
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'trials').find('.tab-count').text()).toBe('2');
    expect(tab(wrapper, 'trials').find('.tab-pip').exists()).toBe(false);

    await tab(wrapper, 'trials').trigger('click');
    expect(tab(wrapper, 'trials').find('.tab-count').text()).toBe('2');
  });

  it('shows the new-trial pip again once the last claim is taken', async () => {
    unseal([entry('resist'), { ...entry('rank-up'), progress: 1, doneDayKey: '2026-11-02', unclaimed: true }]);
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'trials').find('.tab-pip').exists()).toBe(false);

    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, challenges: [entry('resist')] });
    await wrapper.vm.$nextTick();
    expect(tab(wrapper, 'trials').find('.tab-count').exists()).toBe(false);
    expect(tab(wrapper, 'trials').find('.tab-pip').exists()).toBe(true);
  });

  it('greys Quests and Trials out under a lock while sealed, with no badges, and does not open them', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, challenges: [entry('resist')] });
    useQuestStore().addQuest('Today', 'easy', dailyPeriodKey(useDebugClockStore().now()));
    const wrapper = mount(TabBar);
    for (const id of ['quests', 'trials']) {
      expect(tab(wrapper, id).classes()).toContain('sealed');
      expect(tab(wrapper, id).find('.tab-lock').exists()).toBe(true);
    }
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
    for (const id of ['quests', 'trials', 'talents']) {
      expect(tab(wrapper, id).attributes('disabled')).toBeDefined();
      await tab(wrapper, id).trigger('click');
      expect(useTabStore().tab).toBe('skills');
    }
    expect(tab(wrapper, 'skills').attributes('disabled')).toBeUndefined();
    expect(tab(wrapper, 'hero').attributes('disabled')).toBeUndefined();
  });

  it('opens a tab again once it unseals', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, trialsUnlocked: true });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'talents').attributes('disabled')).toBeUndefined();
    await tab(wrapper, 'talents').trigger('click');
    expect(useTabStore().tab).toBe('talents');
  });

  it('drops back to Skills when the tab on show seals, as a death does', async () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 6, questsUnlocked: true, trialsUnlocked: true });
    const wrapper = mount(TabBar);
    await tab(wrapper, 'talents').trigger('click');
    expect(useTabStore().tab).toBe('talents');

    characterStore.setCharacter({ ...characterStore.character, level: 1, questsUnlocked: false, trialsUnlocked: false, talentsUnlocked: false });
    await wrapper.vm.$nextTick();
    expect(useTabStore().tab).toBe('skills');
  });

  it('seals Trials past the level Quests open at', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 2, questsUnlocked: true, trialsUnlocked: false });
    const wrapper = mount(TabBar);
    expect(tab(wrapper, 'quests').classes()).not.toContain('sealed');
    expect(tab(wrapper, 'trials').classes()).toContain('sealed');
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

    it('leaves out a skill resting today and wears no count when nothing is left', () => {
      vi.useFakeTimers({ now: WEDNESDAY });
      const rng = createRng();
      const resting = createHabit('Lift', 'daily', 'medium', false, rng, [0, 1, 3, 4, 5, 6]);
      useHabitStore().habits = [resting];
      expect(tab(mount(TabBar), 'skills').find('.tab-count').exists()).toBe(false);
    });
  });
});
