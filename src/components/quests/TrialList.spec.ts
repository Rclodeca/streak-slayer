// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { goldPrice, seedTrials } from '../../game-engine';
import type { TrialEntry } from '../../game-engine';
import { useQuestCompleteQueue } from '../../composables/useQuestCompleteQueue';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import TrialList from './TrialList.vue';

enableAutoUnmount(afterEach);

describe('TrialList', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    const completions = useQuestCompleteQueue();
    while (completions.current.value) completions.dismiss();
  });

  function give(trials: TrialEntry[] | undefined) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, trials });
  }

  const entry = (id: TrialEntry['id'], overrides: Partial<TrialEntry> = {}): TrialEntry => ({ id, takenDayKey: '2026-11-01', count: 0, ...overrides });
  const mountList = () => mount(TrialList, { global: { plugins: [pinia] } });

  it('shows a card per set, from level 1', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter(seedTrials({ ...characterStore.character, level: 1 }, '2026-11-14', { bossesBeaten: 0, habits: [] }));
    expect(mountList().findAll('li.trial')).toHaveLength(12);
  });

  it('leads with the rung being climbed: name and prize, the deed, its bar, and the rung', () => {
    give([entry('crits', { count: 7, claimed: [0] })]);
    const card = mountList().get('li.trial');
    expect(card.get('.trial-name').text()).toBe('Crits landed');
    expect(card.get('.trial-head .trial-gems').text()).toBe('6');
    expect(card.find('.trial-head .trial-gold').exists()).toBe(false);
    expect(card.get('.trial-deed').text()).toBe('Land 25 critical hits');
    expect(card.get('.trial-count').text()).toBe('7 / 25');
    expect(card.get('.trial-rung').text()).toBe('Rung 2 of 3');
    expect(card.findAll('.trial-pips i').map((i) => i.classes()[0])).toEqual(['paid', 'ahead', 'ahead']);
    expect(card.find('.trial-claim').exists()).toBe(false);
  });

  it('shows a gold rung’s gold at the current boss', () => {
    useBossStore().setBoss({ ...useBossStore().boss, index: 10 });
    give([entry('bosses')]);
    expect(mountList().get('.trial-head .trial-gold').text()).toBe(String(goldPrice(0.5, 10, 0)));
  });

  it('a waiting rung puts Claim in the bar’s place, and claiming pays it', async () => {
    give([entry('resisted', { count: 5 })]);
    const wrapper = mountList();
    const card = wrapper.get('li.trial');
    expect(card.classes()).toContain('ready');
    expect(card.find('.trial-progress').exists()).toBe(false);
    await card.get('.trial-claim').trigger('click');
    expect(useAccountStore().account.gems).toBe(4);
    expect(wrapper.get('li.trial').classes()).not.toContain('ready');
    expect(wrapper.get('li.trial').classes()).not.toContain('open');
  });

  it('a tap folds the ladder out, with only the card’s own Claim', async () => {
    give([entry('quests', { count: 3, claimed: [0] })]);
    const wrapper = mountList();
    expect(wrapper.find('.trial-ladder').exists()).toBe(false);
    await wrapper.get('li.trial').trigger('click');
    const rows = wrapper.findAll('.trial-ladder li');
    expect(rows.map((r) => r.classes()[0])).toEqual(['paid', 'waiting', 'ahead', 'ahead']);
    expect(wrapper.findAll('.trial-claim')).toHaveLength(1);
    expect(wrapper.get('.trial-fold').attributes('aria-expanded')).toBe('true');
    await wrapper.get('.trial-fold').trigger('click');
    expect(wrapper.find('.trial-ladder').exists()).toBe(false);
  });

  it('orders waiting sets first and finished ones last, sunk', () => {
    give([entry('untouched', { count: 15, claimed: [0, 1, 2] }), entry('streak'), entry('crits', { count: 5 })]);
    const cards = mountList().findAll('li.trial');
    expect(cards.map((c) => c.get('.trial-name').text())).toEqual(['Crits landed', 'Longest streak', 'Untouched kills']);
    expect(cards[2].classes()).toContain('done');
    expect(cards[2].get('.trial-status').text()).toBe('All 3 done');
    expect(cards[2].find('.trial-head .trial-pay').exists()).toBe(false);
  });

  it('says so with no sets held', () => {
    give(undefined);
    expect(mountList().get('.section-empty').text()).toBe('Nothing sworn.');
  });
});
