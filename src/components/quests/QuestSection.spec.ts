// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addDaysToDayKey, dailyPeriodKey } from '../../game-engine';
import type { TrialEntry } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import QuestSection from './QuestSection.vue';

enableAutoUnmount(afterEach);

describe('QuestSection', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const entry = (id: TrialEntry['id']): TrialEntry => ({ id, takenDayKey: '2026-11-01', count: 0 });

  function openSection() {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, trials: [entry('resisted')] });
    useQuestStore().addQuest('Clean garage', 'medium', addDaysToDayKey(dailyPeriodKey(useDebugClockStore().now()), 3));
  }

  const mountSection = () => mount(QuestSection, { global: { plugins: [pinia] } });

  it('shows the seal and no + while sealed', () => {
    const wrapper = mountSection();
    expect(wrapper.find('.lock-area').exists()).toBe(true);
    expect(wrapper.find('.add-button').exists()).toBe(false);
  });

  it('titles itself with a banner', () => {
    expect(mountSection().find('h2.section-title .cloth').text()).toBe('Tasks');
  });

  it('lists only the quests the player wrote, with +: the trials are their own modal', () => {
    openSection();
    const wrapper = mountSection();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('li.quest-item').text()).toContain('Clean garage');
    expect(wrapper.find('.add-button').exists()).toBe(true);
    expect(wrapper.find('li.trial').exists()).toBe(false);
  });

  it('shows no group chips until a task has a group, then All plus only the groups in use', async () => {
    openSection();
    const wrapper = mountSection();
    expect(wrapper.find('.group-chips').exists()).toBe(false);
    const due = addDaysToDayKey(dailyPeriodKey(useDebugClockStore().now()), 2);
    useQuestStore().addQuest('Essay draft', 'easy', due, undefined, 'school');
    useAccountStore().renameTaskGroup('school', 'Night class');
    await wrapper.vm.$nextTick();
    const chips = wrapper.findAll('.group-chips .group-chip:not(.edit)').map((c) => c.text());
    expect(chips).toEqual(['All 2', 'Night class 1']);
    expect(wrapper.text()).toContain('Night class');
  });

  it('filters the list to the picked group', async () => {
    openSection();
    const due = addDaysToDayKey(dailyPeriodKey(useDebugClockStore().now()), 2);
    useQuestStore().addQuest('Essay draft', 'easy', due, undefined, 'school');
    const wrapper = mountSection();
    await wrapper.findAll('.group-chips .group-chip')[1].trigger('click');
    expect(wrapper.findAll('li.quest-item').map((li) => li.find('.description').text())).toEqual(['Essay draft']);
  });

  it('checks a task off with the habit box and shows no difficulty pips', async () => {
    openSection();
    const wrapper = mountSection();
    expect(wrapper.find('li.quest-item .pip').exists()).toBe(false);
    await wrapper.find('li.quest-item .strike').trigger('click');
    expect(useQuestStore().quests[0].doneDayKey).toBeDefined();
  });
});
