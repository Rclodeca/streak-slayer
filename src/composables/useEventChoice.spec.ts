// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng, ITEM_CATALOG } from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useQuestStore } from '../store/questStore';
import { useEventChoice } from './useEventChoice';
import { useItemDropQueue } from './useItemDropQueue';

describe('useEventChoice', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // `options` is module-scoped; resolve any leftover picks so it can't leak between tests.
  afterEach(() => {
    useEventChoice().dismissReveal();
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, pendingEventPicks: 0 });
    useEventChoice().ensureChoices();
  });

  function setup(level: number, pendingEventPicks: number) {
    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, level, pendingEventPicks, takenEventIds: [] });
    const habitStore = useHabitStore();
    habitStore.addHabit('Daily good', 'daily', 'medium', false, createRng(1));
    const events = useEventChoice();
    events.ensureChoices();
    return { characterStore, habitStore, events };
  }

  it('rolls up to 3 choices while a pick is pending and none when not', () => {
    const { events } = setup(7, 1);
    expect(events.choices.value.length).toBeGreaterThan(0);
    expect(events.choices.value.length).toBeLessThanOrEqual(3);

    const characterStore = useCharacterStore();
    characterStore.setCharacter({ ...characterStore.character, pendingEventPicks: 0 });
    events.ensureChoices();
    expect(events.choices.value).toEqual([]);
  });

  it('applying a one-time event spends the pick and marks it taken', () => {
    const { characterStore, habitStore, events } = setup(7, 2);
    events.choose('special');

    expect(characterStore.character.pendingEventPicks).toBe(1);
    expect(characterStore.character.takenEventIds).toEqual(['special']);
    expect(habitStore.habits.filter((h) => h.isSpecial)).toHaveLength(1);
    // next pick gets freshly rolled choices that no longer include the taken event
    events.ensureChoices();
    expect(events.choices.value.map((c) => c.id)).not.toContain('special');
  });

  it('logs the new slot count when a slots event is taken', () => {
    const { characterStore, events } = setup(20, 1);
    characterStore.setCharacter({ ...characterStore.character, takenEventIds: ['item-slots'] });
    events.choose('item-slots-2');
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'item-slots-gained', slots: 8 });
  });

  it('item-slots takes effect on the character', () => {
    const { characterStore, events } = setup(7, 1);
    events.choose('item-slots');
    expect(characterStore.character.takenEventIds).toContain('item-slots');
  });

  it('overdrive grants Overdrive to a good habit', () => {
    const { habitStore, events } = setup(3, 1);
    events.choose('overdrive');
    expect(habitStore.habits[0].isOverdrive).toBe(true);
  });

  it('reroll changes the chosen skill to a different damage type', () => {
    const { habitStore, events } = setup(3, 1);
    const before = habitStore.habits[0].damageType;
    events.chooseReroll(habitStore.habits[0].id);
    expect(habitStore.habits[0].damageType).not.toBe(before);
  });

  it('heal restores health and spends the pick', () => {
    const { characterStore, events } = setup(1, 1);
    const full = characterStore.character.currentHealth;
    characterStore.setCharacter({ ...characterStore.character, currentHealth: 0 });
    events.choose('heal');
    expect(characterStore.character.currentHealth).toBeGreaterThan(0);
    expect(characterStore.character.currentHealth).toBeLessThan(full);
    expect(characterStore.character.pendingEventPicks).toBe(0);
  });

  it('item-drop grants exactly one new owned item and queues it for the drop popup', () => {
    const { characterStore, events } = setup(1, 1);
    const { current, dismiss } = useItemDropQueue();
    useBossStore().setBoss({ ...useBossStore().boss, index: 30 }); // a late boss would normally drop several
    events.choose('item-drop');
    expect(characterStore.character.ownedItemIds).toHaveLength(1);
    expect(current.value?.id).toBe(characterStore.character.ownedItemIds[0]);
    dismiss();
  });

  it('double-item enchants an equipped item, reveals it, and the reveal can be dismissed', () => {
    const { characterStore, events } = setup(10, 1);
    characterStore.setCharacter({ ...characterStore.character, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'] });
    events.choose('double-item');

    expect(characterStore.character.doubledItemIds).toEqual(['rusty-blade']);
    expect(events.revealed.value?.id).toBe('rusty-blade');
    events.dismissReveal();
    expect(events.revealed.value).toBeNull();
  });

  it('counts a pick where side-quest was eligible but not offered, toward the guarantee', () => {
    const { characterStore, events } = setup(7, 1);
    const offered = events.choices.value.map((c) => c.id);
    const pick = offered.find((id) => id !== 'side-quest' && id !== 'reroll-skill');
    expect(pick).toBeDefined();
    events.choose(pick as Exclude<typeof offered[number], 'side-quest' | 'reroll-skill'>);
    expect(characterStore.character.sideQuestPicksMissed).toBe(offered.includes('side-quest') ? 0 : 1);
  });

  it('enchanting an item completes a taken Enchanted challenge', () => {
    const { characterStore, events } = setup(20, 1);
    characterStore.setCharacter({
      ...characterStore.character,
      ownedItemIds: ['rusty-blade'],
      equippedItemIds: ['rusty-blade'],
      challenges: [{ id: 'enchant', relicId: 'ember-heart', takenDayKey: '2026-01-01', progress: 0 }],
    });

    events.choose('double-item');

    expect(characterStore.character.challenges?.[0].doneDayKey).toBeDefined();
    expect(characterStore.character.ownedItemIds).toContain('ember-heart');
    useItemDropQueue().dismiss();
  });

  it('an item-drop that finds an epic completes a taken Epic find challenge', () => {
    const { characterStore, events } = setup(40, 1);
    // With every other drop owned, the only item left to find is an epic.
    const owned = ITEM_CATALOG.filter((i) => i.rarity !== 'epic' && i.rarity !== 'relic').map((i) => i.id);
    characterStore.setCharacter({
      ...characterStore.character,
      ownedItemIds: owned,
      challenges: [{ id: 'epic-find', relicId: 'ember-heart', takenDayKey: '2026-01-01', progress: 0 }],
    });

    events.choose('item-drop');

    expect(characterStore.character.challenges?.[0].doneDayKey).toBeDefined();
    expect(characterStore.character.ownedItemIds).toContain('ember-heart');
  });

  describe('side-quest challenge card', () => {
    /** Level 3 with the guarantee due, so the side-quest card is always rolled. */
    function setupSide(overrides: Partial<Parameters<ReturnType<typeof useCharacterStore>['setCharacter']>[0]> = {}) {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({
        ...characterStore.character,
        level: 3,
        pendingEventPicks: 1,
        takenEventIds: [],
        sideQuestPicksMissed: TUNING.SIDE_QUEST_GUARANTEE_LEVELS,
        ...overrides,
      });
      useHabitStore().addHabit('Daily good', 'daily', 'medium', false, createRng(1));
      const events = useEventChoice();
      events.ensureChoices();
      return { characterStore, events };
    }

    /** Drops the in-memory rolled options, as a reload would. */
    function reload(events: ReturnType<typeof useEventChoice>) {
      const characterStore = useCharacterStore();
      const { pendingEventPicks } = characterStore.character;
      characterStore.setCharacter({ ...characterStore.character, pendingEventPicks: 0 });
      events.ensureChoices();
      characterStore.setCharacter({ ...characterStore.character, pendingEventPicks });
      events.ensureChoices();
    }

    it('names a drawn challenge on the rolled side-quest card and persists it', () => {
      const { characterStore, events } = setupSide();
      expect(events.choices.value.map((c) => c.id)).toContain('side-quest');
      const id = characterStore.character.offeredChallengeId;
      expect(id).toBeDefined();
      expect(events.offeredChallenge.value?.id).toBe(id);
      expect(events.offeredChallenge.value?.deed.length).toBeGreaterThan(0);
    });

    it('keeps the same challenge when the popup is reopened or the app reloads', () => {
      const { characterStore, events } = setupSide();
      const id = characterStore.character.offeredChallengeId;
      expect(id).toBeDefined();
      for (let i = 0; i < 5; i++) {
        reload(events);
        expect(events.choices.value.map((c) => c.id)).toContain('side-quest');
        expect(characterStore.character.offeredChallengeId).toBe(id);
      }
    });

    it('redraws when the persisted challenge can no longer be offered', () => {
      const { characterStore, events } = setupSide({ offeredChallengeId: 'resist', challenges: [{ id: 'resist', relicId: 'ember-heart', takenDayKey: '2026-01-01', progress: 0 }] });
      reload(events);
      const id = characterStore.character.offeredChallengeId;
      expect(id).toBeDefined();
      expect(id).not.toBe('resist');
    });

    it('picking any other event clears the offered challenge', () => {
      const { characterStore, events } = setupSide();
      expect(characterStore.character.offeredChallengeId).toBeDefined();
      events.choose('heal');
      expect(characterStore.character.offeredChallengeId).toBeUndefined();
      expect(events.offeredChallenge.value).toBeNull();
    });

    it('chooseSideQuest takes the challenge with a reserved relic, spends the pick and makes no quest', () => {
      const { characterStore, events } = setupSide();
      const id = characterStore.character.offeredChallengeId;

      events.chooseSideQuest();

      expect(characterStore.character.challenges).toHaveLength(1);
      const [entry] = characterStore.character.challenges!;
      expect(entry).toMatchObject({ id, progress: 0 });
      expect(entry.doneDayKey).toBeUndefined();
      expect(ITEM_CATALOG.find((i) => i.id === entry.relicId)?.rarity).toBe('relic');
      expect(characterStore.character.pendingEventPicks).toBe(0);
      expect(characterStore.character.takenEventIds).toEqual([]);
      expect(characterStore.character.offeredChallengeId).toBeUndefined();
      expect(useQuestStore().quests).toEqual([]);
    });

    it('resets the guarantee count when taken, even if the pick claims the last available relic', () => {
      const relics = ITEM_CATALOG.filter((i) => i.rarity === 'relic').map((i) => i.id);
      const [onlyRelic, ...rest] = relics;
      const { characterStore, events } = setupSide({ earnedRelicIds: rest });

      events.chooseSideQuest();

      expect(characterStore.character.challenges?.[0].relicId).toBe(onlyRelic);
      expect(characterStore.character.sideQuestPicksMissed).toBe(0);
    });

    it('a state challenge that is already true completes at once and pays out', () => {
      const { characterStore, events } = setupSide({ offeredChallengeId: 'streak-all' });
      const habit = useHabitStore().habits[0];
      useHabitStore().updateHabit({ ...habit, streakCount: 5 });

      events.chooseSideQuest();

      const [entry] = characterStore.character.challenges!;
      expect(entry.id).toBe('streak-all');
      expect(entry.doneDayKey).toBeDefined();
      expect(characterStore.character.ownedItemIds).toContain(entry.relicId);
      useItemDropQueue().dismiss();
    });
  });
});
