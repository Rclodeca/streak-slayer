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

describe('QuestSection tabs', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function openSection(challenges?: ChallengeEntry[]) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, challenges });
    useQuestStore().addQuest('Clean garage', 'medium', addDaysToDayKey(dailyPeriodKey(useDebugClockStore().now()), 3));
  }

  const entry = (id: ChallengeEntry['id'], overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({
    id,
    relicId: 'ember-heart',
    takenDayKey: '2026-11-01',
    progress: 0,
    ...overrides,
  });

  const mountSection = () => mount(QuestSection, { global: { plugins: [pinia] } });

  it('shows no tabs while sealed', () => {
    const wrapper = mountSection();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('.lock-area').exists()).toBe(true);
  });

  it('opens on Main with the quest list and the + button', () => {
    openSection();
    const wrapper = mountSection();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text().replace(/\d+$/, '').trim())).toEqual(['Main', 'Side']);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(wrapper.find('li.quest-item').exists()).toBe(true);
    expect(wrapper.find('.add-button').exists()).toBe(true);
    expect(wrapper.find('li.challenge').exists()).toBe(false);
  });

  it('Side swaps in the challenge cards, hides +, and counts the active ones', async () => {
    openSection([entry('resist'), entry('rank-up'), entry('enchant', { doneDayKey: '2026-11-02', progress: 1 })]);
    const wrapper = mountSection();
    const side = wrapper.findAll('[role="tab"]')[1];
    expect(side.find('.tab-count').text()).toBe('2');

    await side.trigger('click');

    expect(side.attributes('aria-selected')).toBe('true');
    expect(wrapper.findAll('li.challenge')).toHaveLength(3);
    expect(wrapper.find('li.quest-item').exists()).toBe(false);
    expect(wrapper.find('.add-button').exists()).toBe(false);
  });

  it('Main brings the quests and + back', async () => {
    openSection([entry('resist')]);
    const wrapper = mountSection();
    const [main, side] = wrapper.findAll('[role="tab"]');
    await side.trigger('click');
    await main.trigger('click');
    expect(wrapper.find('li.quest-item').exists()).toBe(true);
    expect(wrapper.find('.add-button').exists()).toBe(true);
  });

  it('shows no count chip with no active challenges', () => {
    openSection([entry('enchant', { doneDayKey: '2026-11-02', progress: 1 })]);
    expect(mountSection().findAll('[role="tab"]')[1].find('.tab-count').exists()).toBe(false);
  });
});
