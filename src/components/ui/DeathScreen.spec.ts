// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { createRng } from '../../game-engine';
import type { Character, Habit } from '../../game-engine';
import { REVIVE_GEMS } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import { useQuestStore } from '../../store/questStore';
import { useQuestMissGate } from '../../composables/useQuestMissGate';
import { useMissedSkillsGate } from '../../composables/useMissedSkillsGate';
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

  describe('the toll', () => {
    it('shows what the fall takes: one level, a tenth of the gold, one item', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 401, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'], currentHealth: 0 });
      useBossStore().setBoss({ ...useBossStore().boss, index: 9, shownIndex: 12 });
      mountWith([{ rank: 1, streakCount: 2 }]);
      await toBonfire();
      const chips = [...document.querySelectorAll('.toll .toll-chip')].map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
      expect(chips).toEqual(['−1 level', '−40', 'One item']);
      expect(document.querySelector('.toll .toll-chip.gold .stat-icon, .toll .toll-chip.gold svg, .toll .toll-chip.gold img')).not.toBeNull();
      expect(document.querySelector('.meta')!.textContent).toContain('Boss 12');
      expect(document.querySelector('.kept')!.textContent).toBe('Your habits keep their power');
      expect(document.querySelector('.restart-button')!.textContent).toBe('Rise again');
    });

    it('shows no toll for a level 1 hero with nothing to lose', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 1, gold: 0, ownedItemIds: [], equippedItemIds: [], currentHealth: 0 });
      mountWith([]);
      await toBonfire();
      expect(document.querySelector('.toll')).toBeNull();
    });
  });

  it('shows the bonfire once his line is done', async () => {
    mountWith([{ rank: 2, streakCount: 3 }]);
    await toBonfire();
    expect(document.querySelector('.figure')).toBeNull();
    expect(document.querySelector('.fire-stage')).not.toBeNull();
    expect(document.querySelector('.kept')!.textContent).toBe('Your habits keep their power');
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

  it('waits while a missed quest is still to land, then opens', async () => {
    const quest = useQuestStore().addQuest('Clean garage', 'medium', '2026-01-01');
    useQuestMissGate().queueMiss(quest);
    mountWith([]);
    await nextTick();
    expect(document.querySelector('.death-layer')).toBeNull();
    useQuestMissGate().acknowledge();
    await nextTick();
    expect(document.querySelector('.death-layer')).not.toBeNull();
  });

  it('waits while the daily update is still to land, then opens', async () => {
    const habit = useHabitStore().addHabit('Read', 'daily', 'medium', false, createRng(9));
    useMissedSkillsGate().queueMiss(habit, '2026-01-02');
    mountWith([]);
    await nextTick();
    expect(document.querySelector('.death-layer')).toBeNull();
    useMissedSkillsGate().acknowledge();
    await nextTick();
    expect(document.querySelector('.death-layer')).not.toBeNull();
  });

  describe('the gem revive', () => {
    const reviveButton = () => document.querySelector('.revive-button') as HTMLButtonElement | null;

    function fallWith(gems: number) {
      useAccountStore().account.gems = gems;
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 0 });
    }

    it('offers the revive at its gem price, and taking it closes the screen', async () => {
      fallWith(REVIVE_GEMS);
      mountWith([]);
      await toBonfire();
      expect(reviveButton()!.textContent).toContain(String(REVIVE_GEMS));
      expect(document.querySelector('.revive-note')!.textContent).toBe('Half health.');
      reviveButton()!.click();
      await nextTick();
      expect(useDeathScreen().isDead.value).toBe(false);
      expect(useAccountStore().account.gems).toBe(0);
    });

    it('is disabled with too few gems', async () => {
      fallWith(REVIVE_GEMS - 1);
      mountWith([]);
      await toBonfire();
      expect(reviveButton()!.disabled).toBe(true);
    });

    it('stays open after a revive against this boss, with a plain note', async () => {
      fallWith(99);
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, revivedAtBoss: useBossStore().boss.index } as Character);
      mountWith([]);
      await toBonfire();
      expect(reviveButton()).not.toBeNull();
      expect(document.querySelector('.revive-note')?.textContent).toBe('Half health.');
    });
  });
});
