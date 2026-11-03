// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { addDaysToDayKey, dailyPeriodKey } from '../../game-engine';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import QuestDetailModal from './QuestDetailModal.vue';

enableAutoUnmount(afterEach);

describe('QuestDetailModal', () => {
  let pinia: ReturnType<typeof createPinia>;
  const q = (selector: string) => document.body.querySelector<HTMLElement>(selector);
  const today = () => dailyPeriodKey(useDebugClockStore().now());

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountPopup(id: string) {
    const questStore = useQuestStore();
    const Host = defineComponent(() => () => h(QuestDetailModal, { quest: questStore.quests.find((x) => x.id === id) ?? null }));
    return mount(Host, { global: { plugins: [pinia] }, attachTo: document.body });
  }

  it('shows a side quest\'s reward as a mystery', () => {
    const quest = useQuestStore().addQuest('Slay it', 'hard', addDaysToDayKey(today(), 4), 'side', 'ember-heart');
    mountPopup(quest.id);
    expect(q('.reward.gift')).not.toBeNull();
    expect(q('.quest-detail')?.textContent).not.toMatch(/small|medium|large/i);
  });

  it('shows EXP and the difficulty pips for a regular quest', () => {
    const quest = useQuestStore().addQuest('Clean garage', 'medium', addDaysToDayKey(today(), 2));
    mountPopup(quest.id);
    expect(q('.reward.gift')).toBeNull();
    expect(document.body.querySelectorAll('.reward .pip.lit')).toHaveLength(2);
    expect(q('.due-line')?.textContent).toContain('2 days left');
  });

  it('labels an overdue quest Overdue, with half EXP — a side quest too', () => {
    const store = useQuestStore();
    const quest = store.addQuest('Slay it', 'hard', addDaysToDayKey(today(), -1), 'side', 'ember-heart');
    store.markOverdue(quest.id);
    mountPopup(quest.id);
    expect(q('.due-line')?.textContent).toContain('Overdue');
    expect(q('.reward.gift')).toBeNull();
    expect(q('.reward')?.textContent).toContain('Half');
  });

  it('deleting takes two taps and removes the quest', async () => {
    const store = useQuestStore();
    const quest = store.addQuest('Clean garage', 'easy', addDaysToDayKey(today(), 1));
    const wrapper = mountPopup(quest.id);

    q('.remove-button')!.click();
    await wrapper.vm.$nextTick();
    expect(store.quests).toHaveLength(1); // the first tap only asks

    q('.confirm-remove-button')!.click();
    expect(store.quests).toEqual([]);
  });

  it('cancel backs out of a delete', async () => {
    const store = useQuestStore();
    const quest = store.addQuest('Clean garage', 'easy', addDaysToDayKey(today(), 1));
    const wrapper = mountPopup(quest.id);

    q('.remove-button')!.click();
    await wrapper.vm.$nextTick();
    q('.cancel-button')!.click();
    await wrapper.vm.$nextTick();

    expect(store.quests).toHaveLength(1);
    expect(q('.remove-button')).not.toBeNull();
  });

  it('a checked-off quest has no delete button', () => {
    const store = useQuestStore();
    const quest = store.addQuest('Clean garage', 'easy', addDaysToDayKey(today(), 1));
    store.markDone(quest.id, today());
    mountPopup(quest.id);
    expect(q('.remove-button')).toBeNull();
  });
});
