// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { createRng } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useHabitStore } from '../../store/habitStore';
import DeathScreen from './DeathScreen.vue';

enableAutoUnmount(afterEach);

describe('DeathScreen', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
    useDeathScreen().triggerDeath();
  });

  afterEach(() => useDeathScreen().dismiss());

  function mountWith(skills: Partial<Habit>[]) {
    const habitStore = useHabitStore();
    skills.forEach((overrides, i) => {
      const added = habitStore.addHabit(`Skill ${i}`, 'daily', 'medium', false, createRng(i + 1));
      habitStore.updateHabit({ ...added, ...overrides });
    });
    return mount(DeathScreen, { global: { plugins: [pinia] }, attachTo: document.body });
  }

  const embers = () => [...document.querySelectorAll('.ember')];
  const tap = () => (document.querySelector('.figure') as HTMLElement).click();

  /** Taps through the hooded figure's line (one tap finishes the typing, the next moves on) to the bonfire. */
  async function toBonfire() {
    tap();
    tap();
    await nextTick();
  }

  it('opens on the hooded figure, with no bonfire yet', () => {
    mountWith([{ rank: 2, streakCount: 3 }]);
    expect(document.querySelector('.died')!.textContent).toBe('You died');
    expect(document.querySelector('.dlg .whole')!.textContent).not.toBe('');
    expect(document.querySelector('.fire-stage')).toBeNull();
  });

  it('shows the bonfire once his line is done', async () => {
    mountWith([{ rank: 2, streakCount: 3 }]);
    await toBonfire();
    expect(document.querySelector('.figure')).toBeNull();
    expect(document.querySelector('.fire-stage')).not.toBeNull();
    expect(document.querySelector('.kept')!.textContent).toBe('Your skills keep their power');
  });

  it('shows an ember per ranked or streaking skill, strongest first', async () => {
    mountWith([
      { name: 'Low', rank: 1, streakCount: 12 },
      { name: 'None', rank: 0, streakCount: 0 },
      { name: 'High', rank: 5, streakCount: 112 },
      { name: 'Cold', rank: 3, streakCount: 0 },
    ]);
    await toBonfire();
    expect(embers().map((el) => el.querySelector('.n')!.textContent)).toEqual(['High', 'Cold', 'Low']);
    expect(embers().map((el) => el.querySelectorAll('.rank-pips i').length)).toEqual([5, 3, 1]);
    expect(embers().map((el) => el.querySelector('.streak')!.textContent!.trim())).toEqual(['112', '—', '12']);
  });

  it('marks a skill whose streak broke as cold', async () => {
    mountWith([{ rank: 3, streakCount: 0 }, { rank: 2, streakCount: 9 }]);
    await toBonfire();
    expect(embers().map((el) => el.classList.contains('cold'))).toEqual([true, false]);
  });

  it('drops the kept-skills section when nothing carries over', async () => {
    mountWith([{ rank: 0, streakCount: 0 }]);
    await toBonfire();
    expect(document.querySelector('.kept')).toBeNull();
    expect(embers()).toHaveLength(0);
  });

  it('"Rise again" ends the death screen', async () => {
    mountWith([]);
    await toBonfire();
    (document.querySelector('.restart-button') as HTMLElement).click();
    await nextTick();
    expect(useDeathScreen().isDead.value).toBe(false);
    expect(document.querySelector('.death-layer')).toBeNull();
  });
});
