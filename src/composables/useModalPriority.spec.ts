// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBossSkillCard } from './useBossSkillCard';
import { useCelebration } from './useCelebration';
import { useDeathScreen } from './useDeathScreen';
import { useServices } from './useServices';
import { useItemDropQueue } from './useItemDropQueue';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useModalPriority } from './useModalPriority';
import { useQuestMissGate } from './useQuestMissGate';
import { useQuestStore } from '../store/questStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { createRng, ITEM_CATALOG } from '../game-engine';

describe('useModalPriority', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    // Every gate here is a module-scope singleton — drain them all so one
    // test's pending state can't leak into the next.
    useDeathScreen().dismiss();
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
    useMissedSkillsGate().acknowledge();
    useQuestMissGate().acknowledge();
    useCelebration().clear();
    useBossSkillCard().clear();
  });

  describe('enchantRevealVisible', () => {
    function showReveal() {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 10, questsUnlocked: true, talentsUnlocked: true, gold: 100000, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'] });
      useServices().buyEnchant('rusty-blade');
    }

    afterEach(() => useServices().dismissReveal());

    it('is false until an item is enchanted, true then, and false once dismissed', () => {
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
      showReveal();
      expect(useModalPriority().enchantRevealVisible.value).toBe(true);
      useServices().dismissReveal();
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });

    it('is false while the character is dead', () => {
      showReveal();
      useDeathScreen().triggerDeath();
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });

    it('is false while an item drop is pending', () => {
      showReveal();
      useItemDropQueue().enqueueDrops([ITEM_CATALOG[0]]);
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });

    it('is false while a habit miss is pending', () => {
      showReveal();
      const habit = useHabitStore().addHabit('Meditate', 'daily', 'medium', false, createRng());
      useMissedSkillsGate().queueMiss(habit, '2024-01-02');
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });

    it('is false while a quest miss is pending', () => {
      showReveal();
      const quest = useQuestStore().addQuest('Clean garage', 'medium', '2026-01-01');
      useQuestMissGate().queueMiss(quest);
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });

    it("waits for a boss skill's card", () => {
      showReveal();
      const { showBossSkill, dismiss } = useBossSkillCard();
      showBossSkill({ skill: 'blind', outcome: 'landed' });
      const { enchantRevealVisible } = useModalPriority();
      expect(enchantRevealVisible.value).toBe(false);
      dismiss();
      expect(enchantRevealVisible.value).toBe(true);
    });

    it('waits for the level-up beat to finish playing', () => {
      showReveal();
      useCelebration().celebrateLevelUp(1);
      const { enchantRevealVisible } = useModalPriority();
      expect(enchantRevealVisible.value).toBe(false);
      useCelebration().clear();
      expect(enchantRevealVisible.value).toBe(true);
    });

    it('waits for the quest and talent unlock popups', () => {
      showReveal();
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, questsUnlocked: false });
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
      characterStore.setCharacter({ ...characterStore.character, questsUnlocked: true, talentsUnlocked: false });
      expect(useModalPriority().enchantRevealVisible.value).toBe(false);
    });
  });

  describe('questMissVisible', () => {
    it('is false when no quest miss is pending', () => {
      const { questMissVisible } = useModalPriority();
      expect(questMissVisible.value).toBe(false);
    });

    it('is true when a quest miss is pending and nothing else is blocking', () => {
      const questStore = useQuestStore();
      const quest = questStore.addQuest('Clean garage', 'medium', '2026-01-01');
      useQuestMissGate().queueMiss(quest);

      const { questMissVisible } = useModalPriority();
      expect(questMissVisible.value).toBe(true);
    });

    it('still shows while the character is dead, so its hits land before the death screen', () => {
      const questStore = useQuestStore();
      const quest = questStore.addQuest('Clean garage', 'medium', '2026-01-01');
      useQuestMissGate().queueMiss(quest);
      useDeathScreen().triggerDeath();

      const { questMissVisible } = useModalPriority();
      expect(questMissVisible.value).toBe(true);
    });

    it('is false while a habit miss is pending, even with a quest miss pending', () => {
      useCharacterStore();
      const habitStore = useHabitStore();
      const questStore = useQuestStore();
      const habit = habitStore.addHabit('Meditate', 'daily', 'medium', false, createRng());
      useMissedSkillsGate().queueMiss(habit, '2024-01-02');
      const quest = questStore.addQuest('Clean garage', 'medium', '2026-01-01');
      useQuestMissGate().queueMiss(quest);

      const { questMissVisible } = useModalPriority();
      expect(questMissVisible.value).toBe(false);
    });
  });

  describe('questUnlockVisible', () => {
    function reachUnlockLevel() {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 2, questsUnlocked: false });
    }

    it('waits for the level-up beat to finish playing', () => {
      reachUnlockLevel();
      useCelebration().celebrateLevelUp(2);
      const { questUnlockVisible } = useModalPriority();
      expect(questUnlockVisible.value).toBe(false);
      useCelebration().clear();
      expect(questUnlockVisible.value).toBe(true);
    });

    it('shows on reaching level 2', () => {
      reachUnlockLevel();
      expect(useModalPriority().questUnlockVisible.value).toBe(true);
    });

    it('closes once quests are unlocked', () => {
      reachUnlockLevel();
      useCharacterStore().unlockQuests();
      expect(useModalPriority().questUnlockVisible.value).toBe(false);
    });

    it('waits for an item drop', () => {
      reachUnlockLevel();
      useItemDropQueue().enqueueDrops([ITEM_CATALOG[0]]);
      expect(useModalPriority().questUnlockVisible.value).toBe(false);
    });
  });

  describe('talentUnlockVisible', () => {
    function reachTalentLevel() {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 5, questsUnlocked: true, talentsUnlocked: false });
    }

    it('shows on reaching level 5', () => {
      reachTalentLevel();
      expect(useModalPriority().talentUnlockVisible.value).toBe(true);
    });

    it('is not due before level 5', () => {
      reachTalentLevel();
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 4 });
      expect(useModalPriority().talentUnlockVisible.value).toBe(false);
    });

    it('waits for the quest popup if it is still up', () => {
      reachTalentLevel();
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, questsUnlocked: false });
      expect(useModalPriority().talentUnlockVisible.value).toBe(false);
    });

    it('waits for the level-up beat to finish playing', () => {
      reachTalentLevel();
      useCelebration().celebrateLevelUp(4);
      expect(useModalPriority().talentUnlockVisible.value).toBe(false);
      useCelebration().clear();
      expect(useModalPriority().talentUnlockVisible.value).toBe(true);
    });

    it('closes once talents are unlocked', () => {
      reachTalentLevel();
      useCharacterStore().unlockTalents();
      expect(useModalPriority().talentUnlockVisible.value).toBe(false);
    });
  });

  describe('bossSkillVisible', () => {
    it('is true when a fired skill is queued and nothing else is blocking', () => {
      useBossSkillCard().showBossSkill({ skill: 'rend', outcome: 'landed', amount: 12 });
      expect(useModalPriority().bossSkillVisible.value).toBe(true);
    });

    it('is false while a habit miss is pending', () => {
      useBossSkillCard().showBossSkill({ skill: 'rend', outcome: 'landed', amount: 12 });
      const habit = useHabitStore().addHabit('Meditate', 'daily', 'medium', false, createRng());
      useMissedSkillsGate().queueMiss(habit, '2024-01-02');
      expect(useModalPriority().bossSkillVisible.value).toBe(false);
    });

    it('waits for the level-up beat to finish playing', () => {
      useBossSkillCard().showBossSkill({ skill: 'rend', outcome: 'landed', amount: 12 });
      useCelebration().celebrateLevelUp(1);
      const { bossSkillVisible } = useModalPriority();
      expect(bossSkillVisible.value).toBe(false);
      useCelebration().clear();
      expect(bossSkillVisible.value).toBe(true);
    });

    it('is false while the character is dead', () => {
      useBossSkillCard().showBossSkill({ skill: 'rend', outcome: 'landed', amount: 12 });
      useDeathScreen().triggerDeath();
      expect(useModalPriority().bossSkillVisible.value).toBe(false);
    });
  });
});
