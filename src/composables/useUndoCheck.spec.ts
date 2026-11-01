// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRng, expToNextLevel } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useBossSkillCard } from './useBossSkillCard';
import { useCelebration } from './useCelebration';
import { useCombatActions } from './useCombatActions';
import { useDeathScreen } from './useDeathScreen';
import { useReviveNotice } from './useReviveNotice';
import { useUndoCheck } from './useUndoCheck';

describe('useUndoCheck', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    // A boss well out of reach of one blow, so a check never kills it.
    const bossStore = useBossStore();
    bossStore.setBoss({ ...bossStore.boss, health: 1_000_000, maxHealth: 1_000_000 });
  });

  // The offer, death flag, revive notice, celebration and skill cards are module-scope singletons.
  afterEach(() => {
    useUndoCheck().forget();
    useDeathScreen().dismiss();
    useReviveNotice().visible.value = false;
    useCelebration().clear();
    useBossSkillCard().clear();
  });

  function addSkill(name: string, isBad = false) {
    const habitStore = useHabitStore();
    const habit = { ...habitStore.addHabit(name, 'daily', 'medium', isBad, createRng()), damageType: 'physical' as const };
    habitStore.updateHabit(habit);
    return habit;
  }

  it('has nothing to undo before any check', () => {
    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('takes back a plain check: the boss, the hero, the skill and the log go back', () => {
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const habitStore = useHabitStore();
    const activityLogStore = useActivityLogStore();
    const habit = addSkill('Read');
    const heroBefore = characterStore.character;
    const bossBefore = bossStore.boss;
    const logBefore = activityLogStore.entries;

    useCombatActions().checkOffHabit(habit.id);
    expect(bossStore.boss.health).toBeLessThan(bossBefore.health);
    expect(habitStore.habits[0].streakCount).toBe(1);

    const { canUndo, undo } = useUndoCheck();
    expect(canUndo()).toBe(true);
    undo();

    expect(bossStore.boss).toEqual(bossBefore);
    expect(characterStore.character).toEqual({ ...heroBefore, undoDayKey: expect.any(String) });
    expect(habitStore.habits[0]).toEqual(habit);
    expect(activityLogStore.entries).toEqual(logBefore);
    expect(canUndo()).toBe(false);
  });

  it('takes back a check that set off a boss skill, and closes its card', () => {
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const habit = addSkill('Lift');
    // Just above the 50% line, so the blow crosses it.
    bossStore.setBoss({ ...bossStore.boss, health: 500_001, skills: [{ at: 0.5, skill: 'rend' }] });
    characterStore.setCharacter({ ...characterStore.character, currentHealth: 500 });
    const bossBefore = bossStore.boss;

    useCombatActions().checkOffHabit(habit.id);
    expect(useBossSkillCard().current.value).toMatchObject({ skill: 'rend', outcome: 'landed' });
    expect(characterStore.character.currentHealth).toBeLessThan(500);

    useUndoCheck().undo();

    expect(useBossSkillCard().current.value).toBeNull();
    expect(characterStore.character.currentHealth).toBe(500);
    expect(bossStore.boss.skills).toEqual(bossBefore.skills); // re-armed
  });

  it('takes back a bad-habit check that hurt but did not fell the hero', () => {
    const characterStore = useCharacterStore();
    const habitStore = useHabitStore();
    const habit = addSkill('Doomscroll', true);
    const healthBefore = characterStore.character.currentHealth;

    useCombatActions().checkOffHabit(habit.id);
    expect(characterStore.character.currentHealth).toBeLessThan(healthBefore);

    useUndoCheck().undo();

    expect(characterStore.character.currentHealth).toBe(healthBefore);
    expect(habitStore.habits[0].lastCompletedPeriodKey).toBe(habit.lastCompletedPeriodKey);
  });

  it('offers nothing for a check that levels up', () => {
    const characterStore = useCharacterStore();
    const habit = addSkill('Read');
    characterStore.setCharacter({ ...characterStore.character, exp: expToNextLevel(characterStore.character.level) - 1 });

    useCombatActions().checkOffHabit(habit.id);

    expect(characterStore.character.level).toBe(2);
    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('offers nothing for a check that kills the boss', () => {
    const bossStore = useBossStore();
    const habit = addSkill('Slay');
    bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });

    useCombatActions().checkOffHabit(habit.id);

    expect(bossStore.boss.index).toBe(2);
    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('offers nothing for a bad-habit check that kills, or that a Phoenix Feather saves', () => {
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000 });

    characterStore.setCharacter({ ...characterStore.character, currentHealth: 1 });
    useCombatActions().checkOffHabit(addSkill('Doomscroll', true).id);
    expect(useDeathScreen().isDead.value).toBe(true);
    expect(useUndoCheck().canUndo()).toBe(false);

    useDeathScreen().dismiss();
    characterStore.setCharacter({ ...characterStore.character, currentHealth: 1, ownedItemIds: ['phoenix-feather'], equippedItemIds: ['phoenix-feather'] });
    useCombatActions().checkOffHabit(addSkill('Snack', true).id);
    expect(useReviveNotice().visible.value).toBe(true);
    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('a later check that levels up takes away the offer for an earlier one', () => {
    const characterStore = useCharacterStore();
    const first = addSkill('Read');
    const second = addSkill('Run');
    const { checkOffHabit } = useCombatActions();

    checkOffHabit(first.id);
    characterStore.setCharacter({ ...characterStore.character, exp: expToNextLevel(characterStore.character.level) - 1 });
    checkOffHabit(second.id);

    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('only ever takes back the latest check', () => {
    const habitStore = useHabitStore();
    const first = addSkill('Read');
    const second = addSkill('Run');
    const { checkOffHabit } = useCombatActions();

    checkOffHabit(first.id);
    checkOffHabit(second.id);
    useUndoCheck().undo();

    expect(habitStore.habits.find((h) => h.id === first.id)?.streakCount).toBe(1);
    expect(habitStore.habits.find((h) => h.id === second.id)?.streakCount).toBe(0);
  });

  it('anything else since the check takes the offer away', () => {
    const characterStore = useCharacterStore();
    useCombatActions().checkOffHabit(addSkill('Read').id);

    characterStore.setName('Ash');

    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('the offer ends with the day', () => {
    useCombatActions().checkOffHabit(addSkill('Read').id);

    useDebugClockStore().skipToNextDay();

    expect(useUndoCheck().canUndo()).toBe(false);
  });

  it('works once a day', () => {
    const habit = addSkill('Read');
    const { checkOffHabit } = useCombatActions();
    const { canUndo, undo } = useUndoCheck();

    checkOffHabit(habit.id);
    undo();
    checkOffHabit(habit.id);
    expect(canUndo()).toBe(false);

    useDebugClockStore().skipToNextDay();
    checkOffHabit(habit.id);
    expect(canUndo()).toBe(true);
  });
});
