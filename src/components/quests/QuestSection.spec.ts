// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addDaysToDayKey, dailyPeriodKey } from '../../game-engine';
import type { TrialEntry } from '../../game-engine';
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
    expect(mountSection().find('h2.section-title .cloth').text()).toBe('Quests');
  });

  it('lists only the quests the player wrote, with +: the trials are their own modal', () => {
    openSection();
    const wrapper = mountSection();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('li.quest-item').text()).toContain('Clean garage');
    expect(wrapper.find('.add-button').exists()).toBe(true);
    expect(wrapper.find('li.trial').exists()).toBe(false);
  });
});
