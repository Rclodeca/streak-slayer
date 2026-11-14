// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedChallenges } from '../../game-engine';
import type { ChallengeEntry } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import TrialSection from './TrialSection.vue';

enableAutoUnmount(afterEach);

describe('TrialSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  const entry = (id: ChallengeEntry['id'], overrides: Partial<ChallengeEntry> = {}): ChallengeEntry => ({
    id,
    takenDayKey: '2026-11-01',
    progress: 0,
    ...overrides,
  });

  function give(challenges?: ChallengeEntry[]) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level: 1, challenges });
  }

  it('is open from level 1, with no seal', () => {
    const characterStore = useCharacterStore();
    characterStore.setCharacter(seedChallenges({ ...characterStore.character, level: 1 }, '2026-11-14'));
    const wrapper = mount(TrialSection);
    expect(wrapper.find('.lock-area').exists()).toBe(false);
    expect(wrapper.findAll('li.challenge')).toHaveLength(17);
  });

  it('lists the challenges, ready first, then active, and paid ones last, with no +', () => {
    give([entry('enchant', { doneDayKey: '2026-11-02', progress: 1 }), entry('resist')]);
    const wrapper = mount(TrialSection);
    const cards = wrapper.findAll('li.challenge');
    expect(cards).toHaveLength(2);
    expect(cards[1].classes()).toContain('done');
    expect(wrapper.find('.add-button').exists()).toBe(false);
  });

  it('titles itself with a banner', () => {
    expect(mount(TrialSection).find('h2.section-title .cloth').text()).toBe('Trials');
  });

  it('says so with none held', () => {
    give();
    expect(mount(TrialSection).find('.section-empty').text()).toBe('Nothing sworn.');
  });

  it('never tags a trial as new: all of them are live from the start', () => {
    give([entry('resist')]);
    expect(mount(TrialSection).find('.challenge-new').exists()).toBe(false);
  });
});
