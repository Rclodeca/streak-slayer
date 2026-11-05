// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addDaysToDayKey, dailyPeriodKey } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
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

  const entry = (id: ChallengeEntry['id']): ChallengeEntry => ({ id, relicId: 'ember-heart', takenDayKey: '2026-11-01', progress: 0 });

  function openSection() {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, challenges: [entry('resist')] });
    useQuestStore().addQuest('Clean garage', 'medium', addDaysToDayKey(dailyPeriodKey(useDebugClockStore().now()), 3));
  }

  const mountSection = () => mount(QuestSection, { global: { plugins: [pinia] } });

  it('shows the seal and no + while sealed', () => {
    const wrapper = mountSection();
    expect(wrapper.find('.lock-area').exists()).toBe(true);
    expect(wrapper.find('.add-button').exists()).toBe(false);
  });

  it('lists only the quests the player wrote, with +: the challenges are Trials now', () => {
    openSection();
    const wrapper = mountSection();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('li.quest-item').text()).toContain('Clean garage');
    expect(wrapper.find('.add-button').exists()).toBe(true);
    expect(wrapper.find('li.challenge').exists()).toBe(false);
  });
});
