// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import ChallengeList from './ChallengeList.vue';

enableAutoUnmount(afterEach);

describe('ChallengeList', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function give(challenges: ChallengeEntry[] | undefined) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, challenges });
  }

  const entry = (id: ChallengeEntry['id'], overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({
    id,
    relicId: 'ember-heart',
    takenDayKey: '2026-11-01',
    progress: 0,
    ...overrides,
  });

  const mountList = () => mount(ChallengeList, { global: { plugins: [pinia] } });

  it('shows a counted challenge as a bar with cur / max', () => {
    give([entry('resist', { progress: 2 })]);
    const card = mountList().get('li.challenge');
    expect(card.find('.challenge-bar').exists()).toBe(true);
    expect(card.text()).toContain('2 / 5');
    expect(card.text()).toContain('Hold the line');
    expect(card.text()).toContain('Resist 5 bad habits.');
  });

  it('shows a state challenge as its status text', () => {
    useHabitStore().addHabit('Daily', 'daily', 'easy', false, createRng(1));
    give([entry('streak-all')]);
    const card = mountList().get('li.challenge');
    expect(card.find('.challenge-bar').exists()).toBe(false);
    expect(card.get('.challenge-status').text()).toBe('0 of 1 at 3+');
  });

  it('shows the boss number and whether it has struck for Untouched', () => {
    give([entry('untouched')]);
    const boss = useBossStore().boss;
    expect(mountList().get('.challenge-status').text()).toBe(`Boss ${boss.index} · untouched so far`);
  });

  it('an active card shows a gift "?" and never the relic name', () => {
    give([entry('rank-up')]);
    const card = mountList().get('li.challenge');
    expect(card.get('.challenge-gift').text()).toContain('?');
    expect(card.text()).not.toContain('Ember Heart');
  });

  it('a done card sinks and names the relic it paid, in place of the gift', () => {
    give([entry('rank-up', { progress: 1, doneDayKey: '2026-11-02' })]);
    const card = mountList().get('li.challenge');
    expect(card.classes()).toContain('done');
    expect(card.find('.challenge-gift').exists()).toBe(false);
    expect(card.text()).toContain('Ember Heart');
  });

  it('lists active challenges first and done ones last', () => {
    give([entry('rank-up', { doneDayKey: '2026-11-02' }), entry('resist'), entry('enchant')]);
    const names = mountList().findAll('li.challenge .challenge-name').map((n) => n.text());
    expect(names).toEqual(['Hold the line', 'Enchanted', 'Rank up']);
  });

  it('shows the empty line with no challenges, or a character from before challenges', () => {
    give([]);
    expect(mountList().find('.section-empty').exists()).toBe(true);
    give(undefined);
    const list = mountList();
    expect(list.get('.section-empty').text().length).toBeGreaterThan(0);
    expect(list.find('li.challenge').exists()).toBe(false);
  });
});
