// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HighScoreRun } from '../../store/highScoreStore';
import { useHighScoreStore } from '../../store/highScoreStore';
import HighScorePage from './HighScorePage.vue';

enableAutoUnmount(afterEach);

const stats = { physicalDamage: 10, magicDamage: 10, healing: 5, health: 100, trueDamage: 5, critChance: 0.05 };
const run = (overrides: Partial<HighScoreRun>): HighScoreRun => ({
  id: Math.random().toString(36),
  bossIndex: 38,
  level: 31,
  startedDayKey: '2026-10-01',
  endedDayKey: '2026-11-01',
  daysLived: 32,
  stats,
  habits: [],
  items: [],
  heroName: 'Aldric',
  heroClass: 'warrior',
  ...overrides,
});

describe('HighScorePage', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const lines = () => [...document.querySelectorAll('.epitaph-line')].map((l) => l.textContent!.replace(/\s+/g, ' ').trim());

  it('says it fills after the first prestige', () => {
    const wrapper = mount(HighScorePage, { global: { plugins: [pinia] } });
    expect(wrapper.text()).toContain('after your first prestige.');
  });

  it('shows a retirement with its deaths, and an older death run as before', () => {
    useHighScoreStore().topRuns = [run({ prestige: 1, deaths: 2 }), run({ prestige: 2, deaths: 1, bossIndex: 30 }), run({ bossIndex: 12, level: 9 })];
    mount(HighScorePage, { global: { plugins: [pinia] }, attachTo: document.body });
    expect(lines()).toEqual(['Retired at level 31 · 2 deaths', 'Retired at level 31 · 1 death', 'Fell before Boss 12 at level 9.']);
  });
});
