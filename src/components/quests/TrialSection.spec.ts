// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeChallenges } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useTrialSeenStore } from '../../store/trialSeenStore';
import TrialSection from './TrialSection.vue';

enableAutoUnmount(afterEach);

describe('TrialSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const entry = (id: ChallengeEntry['id'], overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({
    id,
    relicId: 'ember-heart',
    takenDayKey: '2026-11-01',
    progress: 0,
    ...overrides,
  });

  function openTrials(challenges?: ChallengeEntry[]) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, challenges });
  }

  it('is sealed with the quests', () => {
    const wrapper = mount(TrialSection);
    expect(wrapper.find('.lock-area').exists()).toBe(true);
    expect(wrapper.find('li.challenge').exists()).toBe(false);
  });

  it('lists the challenges, active first, with no +', () => {
    openTrials([entry('enchant', { doneDayKey: '2026-11-02', progress: 1 }), entry('resist')]);
    const wrapper = mount(TrialSection);
    const cards = wrapper.findAll('li.challenge');
    expect(cards).toHaveLength(2);
    expect(cards[1].classes()).toContain('done');
    expect(wrapper.find('.add-button').exists()).toBe(false);
  });

  it('titles itself with a banner', () => {
    expect(mount(TrialSection).find('h2.section-title .cloth').text()).toBe('Trials');
  });

  it('says so with none sworn', () => {
    openTrials();
    expect(mount(TrialSection).find('.section-empty').text()).toBe('Nothing sworn.');
  });

  it('tags the trials that were new when the Trials tab opened', async () => {
    openTrials([entry('resist')]);
    const trialSeen = useTrialSeenStore();
    const wrapper = mount(TrialSection);
    expect(wrapper.find('.challenge-new').exists()).toBe(false);

    trialSeen.visit(activeChallenges(useCharacterStore().character));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.challenge-new').text()).toBe('New');

    trialSeen.leave();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.challenge-new').exists()).toBe(false);
  });
});
