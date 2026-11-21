// @vitest-environment jsdom

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { createRng } from '../../game-engine';
import type { Habit } from '../../game-engine';
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

  const text = (selector: string) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  /** Lets the screen render. */
  async function toChoice() {
    await nextTick();
  }

  it('opens straight on the choice: you fell, to this boss, with no cutscene', async () => {
    useBossStore().setBoss({ ...useBossStore().boss, index: 9, shownIndex: 12 });
    mountWith([]);
    await toChoice();
    expect(document.querySelector('.figure')).toBeNull();
    expect(document.querySelector('.died')).toBeNull();
    expect(text('.fell')).toBe('You fell');
    expect(text('.by')).toContain('Boss 12');
  });

  describe('rising again', () => {
    it('names the item the fall marked, and the level and gold it takes', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 401, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'], fallItemId: 'rusty-blade', currentHealth: 0 });
      mountWith([]);
      await toChoice();
      expect(text('.drop-name')).toBe('Rusty Hatchet');
      expect(text('.drop-tag')).toBe('Dropped');
      expect([...document.querySelectorAll('.losses .loss')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['−1 level', '−40 gold']);
      expect(document.querySelector('.losses .loss .stat-icon')).not.toBeNull();
      expect(text('.rise-button')).toBe('Rise again');
    });

    it('shows no losses for a level 1 hero with nothing to lose', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 1, gold: 0, ownedItemIds: [], equippedItemIds: [], currentHealth: 0 });
      mountWith([]);
      await toChoice();
      expect(document.querySelector('.drop')).toBeNull();
      expect(document.querySelector('.losses')).toBeNull();
    });
  });

  it('"Rise again" ends the death screen', async () => {
    mountWith([]);
    await toChoice();
    (document.querySelector('.rise-button') as HTMLElement).click();
    await nextTick();
    expect(useDeathScreen().isDead.value).toBe(false);
    expect(document.querySelector('.death-layer')).toBeNull();
  });

  it('waits for the killing hit to land on the stage, then opens', async () => {
    vi.useFakeTimers();
    try {
      useDeathScreen().dismiss();
      useDeathScreen().triggerDeath(1100);
      mountWith([]);
      await nextTick();
      expect(document.querySelector('.death-layer')).toBeNull();
      vi.advanceTimersByTime(1100);
      await nextTick();
      expect(document.querySelector('.death-layer')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
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

    it('with gems, Revive at half HP comes first and Rise again under it', async () => {
      fallWith(REVIVE_GEMS);
      mountWith([]);
      await toChoice();
      const keys = [...document.querySelectorAll('.acts button')].map((button) => button.className);
      expect(keys).toEqual(['revive-button', 'rise-button']);
      expect(text('.acts .revive-button')).toContain('Revive at half HP');
      expect(text('.acts .revive-price')).toBe(String(REVIVE_GEMS));
      expect(document.querySelector('.acts .revive-price .stat-icon')).not.toBeNull();
      expect(document.querySelector('.revive-path')).toBeNull();
      expect(document.querySelector('.or')).toBeNull();
    });

    it('taking the revive closes the screen and spends the gems', async () => {
      fallWith(REVIVE_GEMS);
      mountWith([]);
      await toChoice();
      reviveButton()!.click();
      await nextTick();
      expect(useDeathScreen().isDead.value).toBe(false);
      expect(useAccountStore().account.gems).toBe(0);
    });

    it('labels what rising again costs', async () => {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 401, currentHealth: 0 });
      mountWith([]);
      await toChoice();
      expect(text('.rise-path .cost-label')).toBe('Rising again costs');
      expect(document.querySelector('.rise-path h3')).toBeNull();
      expect(document.querySelector('.losses')!.getAttribute('aria-label')).toBeNull();
    });

    it('short of gems, shows how far off and Get gems opens the Challenges over the screen', async () => {
      fallWith(REVIVE_GEMS - 5);
      mountWith([]);
      await toChoice();
      expect(reviveButton()).toBeNull();
      expect(text('.acts .short')).toBe('Get more gems to revive at half HP');
      expect(text('.gems-held .count')).toBe(`${REVIVE_GEMS - 5} / ${REVIVE_GEMS}`);
      expect(document.querySelector('.gems-held .count .stat-icon')).not.toBeNull();
      expect([...document.querySelectorAll('.acts > *')].map((el) => el.className.split(' ')[0])).toEqual(['short', 'gems-held', 'gems-button', 'rise-button']);
      (document.querySelector('.gems-button') as HTMLElement).click();
      await nextTick();
      expect(document.querySelector('.modal-backdrop.over')).not.toBeNull();
      expect(useDeathScreen().isDead.value).toBe(true);
    });
  });

  describe('the preview (testing)', () => {
    beforeEach(() => {
      useDeathScreen().dismiss();
      useDeathScreen().triggerPreview();
    });

    it('shows a standing hero the page as if fallen: the revive, and a worn item named', async () => {
      useAccountStore().account.gems = REVIVE_GEMS;
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 401, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'] });
      mountWith([]);
      await nextTick();
      expect(document.querySelector('.revive-button')).not.toBeNull();
      expect(text('.drop-name')).toBe('Rusty Hatchet');
    });

    it('both choices just close it, changing nothing', async () => {
      useAccountStore().account.gems = REVIVE_GEMS;
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 20, gold: 401, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'] });
      const before = { ...characterStore.character };
      mountWith([]);
      await nextTick();
      (document.querySelector('.revive-button') as HTMLElement).click();
      await nextTick();
      expect(useDeathScreen().isDead.value).toBe(false);
      expect(useAccountStore().account.gems).toBe(REVIVE_GEMS);
      expect(characterStore.character).toEqual(before);
    });
  });
});
