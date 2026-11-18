// @vitest-environment jsdom
//
// This composable reads/writes Pinia store state, which is fine under the
// project's default `node` test environment — but we still want a DOM
// present in case any transitive dependency expects one, matching the
// convention used by `store/index.spec.ts` and `useDailyRollover.spec.ts`.

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDaysToDayKey, availableRelics, bossNumber, createCharacter, createRng, dailyPeriodKey, dayOfWeekIndex, effectiveStat, expToNextLevel, heroClassFor, periodKeyFor, PERSONALITY_NAME, PRESTIGE_GEMS, questSlotExp, REVIVE_GEMS, goldPrice, weeklyPeriodKey } from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useHighScoreStore } from '../store/highScoreStore';
import { useQuestStore } from '../store/questStore';
import { useBossSkillCard } from './useBossSkillCard';
import { useCelebration } from './useCelebration';
import { useCombatActions } from './useCombatActions';
import { useDeathScreen } from './useDeathScreen';
import { useRetiredHero } from './useRetiredHero';
import { useHoodedFigure } from './useHoodedFigure';
import { useItemDropQueue } from './useItemDropQueue';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useQuestMissGate } from './useQuestMissGate';
import { useQuestCompleteQueue } from './useQuestCompleteQueue';
import { useUndoCheck } from './useUndoCheck';
import { setHitPlayer } from './useHitFeed';
import type { Character, Habit, Quest, TrialEntry, TrialSetId } from '../game-engine';
import type { Hit } from './useHitFeed';
import { useReviveNotice } from './useReviveNotice';

describe('useCombatActions', () => {
  beforeEach(() => {
    localStorage.clear(); // highScoreStore persists outside Pinia's own state
    setActivePinia(createPinia());
  });

  // `isDead`/revive-notice `visible` are module-scope singletons (see
  // useDeathScreen.ts/useReviveNotice.ts) — dismiss/clear them after every
  // test so state triggered in one test can't leak into the next.
  afterEach(() => {
    useDeathScreen().dismiss();
    useHoodedFigure().endScene();
    useReviveNotice().visible.value = false;
    useCelebration().clear();
    useBossSkillCard().clear();
    setHitPlayer(null);
  });

  describe('hits sent to the stage', () => {
    let hits: Hit[];
    beforeEach(() => {
      hits = [];
      setHitPlayer((hit) => {
        hits.push(hit);
        return 480;
      });
    });

    it("sends the hero's blow with its type, the boss's HP change, and what was reflected", () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Read', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'magic' });
      bossStore.setBoss({ ...bossStore.boss, health: 100000, maxHealth: 100000, reflectDayKey: dailyPeriodKey(useDebugClockStore().now()) });
      const bossBefore = bossStore.boss;
      const heroBefore = characterStore.character.currentHealth;

      checkOffHabit(habit.id);

      expect(hits).toHaveLength(1);
      const [hit] = hits;
      expect(hit).toMatchObject({ kind: 'strike', by: 'hero', type: 'magic', bossIndex: bossBefore.index, hp: bossStore.boss.health - bossBefore.health });
      if (hit.kind !== 'strike') throw new Error('not a strike');
      expect(hit.amount).toBeGreaterThan(0);
      expect(hit.reflect?.amount).toBeCloseTo((hit.amount * TUNING.BOSS_SKILLS.REFLECT_PCT) / 100);
      expect(hit.reflect?.hp).toBeCloseTo(characterStore.character.currentHealth - heroBefore);
      expect(hit.lifesteal).toBeUndefined();
    });

    it('splits the hero HP change into what was reflected and what was stolen', () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Run', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical' });
      // Too sturdy to fall, so no kill's heal muddies the hit's own change.
      bossStore.setBoss({ ...bossStore.boss, health: 100000, maxHealth: 100000, reflectDayKey: dailyPeriodKey(useDebugClockStore().now()) });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 500, ownedItemIds: ['vampiric-fang'], equippedItemIds: ['vampiric-fang'] });

      checkOffHabit(habit.id);

      const [hit] = hits;
      if (hit.kind !== 'strike') throw new Error('not a strike');
      expect(hit.lifesteal?.amount).toBeCloseTo(hit.amount * 0.03);
      expect(hit.reflect!.hp + hit.lifesteal!.hp).toBeCloseTo(characterStore.character.currentHealth - 500);
    });

    it("sends the boss's blow on a bad habit, and the life it steals", () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Doomscroll', 'daily', 'medium', true, createRng());
      bossStore.setBoss({ ...bossStore.boss, health: 100, lifestealPct: 0.15 });
      const heroBefore = characterStore.character.currentHealth;

      checkOffHabit(habit.id);

      const dealt = heroBefore - characterStore.character.currentHealth;
      expect(hits).toEqual([
        expect.objectContaining({ kind: 'strike', by: 'boss', amount: dealt, hp: -dealt, lifesteal: { amount: bossStore.boss.health - 100, hp: bossStore.boss.health - 100 } }),
      ]);
    });

    it('sends a heal, then the true damage Censer of Wrath adds to it', () => {
      const habitStore = useHabitStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      const habit = { ...habitStore.addHabit('Stretch', 'daily', 'medium', false, createRng()), damageType: 'healing' as const };
      habitStore.updateHabit(habit);
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 100, ownedItemIds: ['censer-of-wrath'], equippedItemIds: ['censer-of-wrath'] });

      checkOffHabit(habit.id);

      expect(hits.map((h) => h.kind)).toEqual(['heal', 'strike']);
      expect(hits[0]).toMatchObject({ amount: characterStore.character.currentHealth - 100, hp: characterStore.character.currentHealth - 100 });
      expect(hits[1]).toMatchObject({ by: 'hero', type: 'trueDamage', crit: false });
    });

    it('sends a Rend as its own hurt after the blow, and logs it under the skill', () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Lift', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical' });
      // Just above the 50% line, so any blow crosses it without killing.
      bossStore.setBoss({ ...bossStore.boss, health: 50001, maxHealth: 100000, skills: [{ at: 0.5, skill: 'rend' }] });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 500, ownedItemIds: ['vampiric-fang'], equippedItemIds: ['vampiric-fang'] });

      checkOffHabit(habit.id);

      expect(hits.map((h) => h.kind)).toEqual(['strike', 'hurt']);
      const [strike, hurt] = hits;
      if (strike.kind !== 'strike' || hurt.kind !== 'hurt') throw new Error('wrong hits');
      // The blow's lifesteal is all of the blow's HP change; Rend shows on its own.
      expect(strike.lifesteal?.hp).toBeCloseTo(strike.lifesteal!.amount);
      expect(hurt.hp).toBeCloseTo(-hurt.amount);
      expect(characterStore.character.currentHealth).toBeCloseTo(500 + strike.lifesteal!.amount - hurt.amount);
      const entries = useActivityLogStore().entries;
      // Lifesteal rides on the blow's own entry, not a row of its own.
      expect(entries[0]).toMatchObject({ kind: 'skill-damage' });
      expect((entries[0] as { lifesteal: number }).lifesteal).toBeCloseTo(strike.lifesteal!.amount);
      expect(entries.some((e) => e.kind === 'lifesteal')).toBe(false);
      expect(entries[1]).toMatchObject({ kind: 'boss-skill', skill: 'rend', outcome: 'landed' });
      expect((entries[1] as { amount: number }).amount).toBeCloseTo(hurt.amount);
    });

    it('logs which stat an Empower doubled, and the boss keeps it', () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Lift', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical' });
      bossStore.setBoss({ ...bossStore.boss, health: 50001, maxHealth: 100000, skills: [{ at: 0.5, skill: 'empower' }] });
      const before = { ...bossStore.boss };

      checkOffHabit(habit.id);

      const entry = useActivityLogStore().entries.find((e) => e.kind === 'boss-skill');
      if (entry?.kind !== 'boss-skill' || !entry.stat) throw new Error('no Empower entry with a stat');
      expect(entry).toMatchObject({ skill: 'empower', outcome: 'landed' });
      expect(bossStore.boss[entry.stat]).toBe(before[entry.stat] * 2);
    });

    it("opens a fired skill's card once the blow that set it off lands", () => {
      vi.useFakeTimers();
      try {
        const habitStore = useHabitStore();
        const bossStore = useBossStore();
        const { checkOffHabit } = useCombatActions();
        const habit = habitStore.addHabit('Lift', 'daily', 'medium', false, createRng());
        habitStore.updateHabit({ ...habit, damageType: 'physical' });
        bossStore.setBoss({ ...bossStore.boss, health: 50001, maxHealth: 100000, skills: [{ at: 0.5, skill: 'blind' }] });

        checkOffHabit(habit.id);

        const { current } = useBossSkillCard();
        vi.advanceTimersByTime(479);
        expect(current.value).toBeNull();
        vi.advanceTimersByTime(1);
        expect(current.value).toMatchObject({ skill: 'blind', outcome: 'landed' });
      } finally {
        vi.useRealTimers();
      }
    });

    it('logs a Wounds skill as the familiar Wounds entry', () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const { checkOffHabit } = useCombatActions();
      const habit = habitStore.addHabit('Lift', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical' });
      bossStore.setBoss({ ...bossStore.boss, health: 50001, maxHealth: 100000, skills: [{ at: 0.5, skill: 'wounds' }] });

      checkOffHabit(habit.id);

      expect(useActivityLogStore().entries[1]).toMatchObject({ kind: 'wounds-applied', durationDays: 2, effectRate: 0.5 });
    });

    it("sends the boss's blow on a missed quest, like a missed daily", () => {
      const bossStore = useBossStore();
      const characterStore = useCharacterStore();
      const questStore = useQuestStore();
      const { failQuest } = useCombatActions();
      const quest = questStore.addQuest('Clean garage', 'medium', '2026-02-01');
      const heroBefore = characterStore.character.currentHealth;

      failQuest(quest.id);

      const lost = heroBefore - characterStore.character.currentHealth;
      expect(lost).toBeGreaterThan(0);
      expect(hits).toEqual([expect.objectContaining({ kind: 'strike', by: 'boss', amount: lost, hp: -lost, bossIndex: bossStore.boss.index })]);
    });

    it('flags the boss as having hurt the player when a quest is missed', () => {
      const bossStore = useBossStore();
      const questStore = useQuestStore();
      const { failQuest } = useCombatActions();
      expect(bossStore.boss.hurtPlayer).toBeUndefined();
      failQuest(questStore.addQuest('Clean garage', 'medium', '2026-02-01').id);
      expect(bossStore.boss.hurtPlayer).toBe(true);
    });

    it('lets the killing blow land before the boss falls', () => {
      vi.useFakeTimers();
      try {
        const habitStore = useHabitStore();
        const bossStore = useBossStore();
        const { checkOffHabit } = useCombatActions();
        const habit = habitStore.addHabit('Slay the boss', 'daily', 'hard', false, createRng());
        habitStore.updateHabit({ ...habit, damageType: 'physical' });
        bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });

        checkOffHabit(habit.id);

        const { phase } = useCelebration();
        vi.advanceTimersByTime(479);
        expect(phase.value).toBe('struck');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('talents in the feed', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function withTalents(talents: Character['talents']) {
      const characterStore = useCharacterStore();
      characterStore.setCharacter({ ...characterStore.character, level: 12, talents });
      return characterStore;
    }

    it('a dodged bad-habit hit sends nothing to the stage, costs no health, and is logged as a dodge', () => {
      const hits: Hit[] = [];
      setHitPlayer((hit) => (hits.push(hit), 480));
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const characterStore = withTalents({ unbroken: 1 });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 40 });
      const habitStore = useHabitStore();
      const habit = habitStore.addHabit('Skip dessert', 'daily', 'medium', true, createRng());
      habitStore.updateHabit({ ...habit, streakCount: 4 });

      useCombatActions().checkOffHabit(habit.id);

      expect(characterStore.character.currentHealth).toBe(40);
      expect(hits).toEqual([]);
      expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'dodged', name: 'Skip dessert' });
      expect(habitStore.habits[0].streakCount).toBe(0);
    });

    it('a dodged missed quest is logged as a dodge too, and the quest still goes overdue', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const characterStore = withTalents({ unbroken: 1 });
      const before = characterStore.character.currentHealth;
      const questStore = useQuestStore();
      const quest = questStore.addQuest('Clean garage', 'medium', '2026-02-01');

      useCombatActions().failQuest(quest.id);

      expect(characterStore.character.currentHealth).toBe(before);
      expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'dodged', name: 'Clean garage' });
      expect(questStore.quests[0].overdue).toBe(true);
    });

    it('a hit that is not dodged is logged as a hit', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      withTalents({ unbroken: 1 });
      const habitStore = useHabitStore();
      const habit = habitStore.addHabit('Skip dessert', 'daily', 'medium', true, createRng());
      useCombatActions().checkOffHabit(habit.id);
      expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'hit', habitName: 'Skip dessert' });
    });

    it('a heal that crits through Blessed is logged as a crit', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const characterStore = withTalents({ blessed: 1 });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 5 });
      const habitStore = useHabitStore();
      const habit = habitStore.addHabit('Stretch', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'healing' });

      useCombatActions().checkOffHabit(habit.id);

      expect(useActivityLogStore().entries.find((e) => e.kind === 'heal')).toMatchObject({ kind: 'heal', crit: true });
    });

    it('a heal with no crit carries no crit flag', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const characterStore = withTalents({ blessed: 1 });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 5 });
      const habitStore = useHabitStore();
      const habit = habitStore.addHabit('Stretch', 'daily', 'medium', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'healing' });

      useCombatActions().checkOffHabit(habit.id);

      expect(useActivityLogStore().entries.find((e) => e.kind === 'heal')).not.toHaveProperty('crit');
    });

    it('Second Wind logs what it healed when a boss falls, under its own name', () => {
      const characterStore = withTalents({ 'second-wind': 3 });
      characterStore.setCharacter({ ...characterStore.character, currentHealth: 1 });
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const habit = habitStore.addHabit('Slay the boss', 'daily', 'hard', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical' });
      bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });

      useCombatActions().checkOffHabit(habit.id);

      const entry = useActivityLogStore().entries.find((e) => e.kind === 'item-heal');
      expect(entry).toMatchObject({ kind: 'item-heal', itemName: 'Second Wind' });
      expect((entry as { amount: number }).amount).toBeGreaterThan(0);
    });
  });

  it('checkOffHabit is a no-op when called a second time on a habit already completed this period', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Meditate', 'daily', 'medium', false, createRng());

    // First call: applies combat effects and stamps the habit as completed
    // for the current period.
    checkOffHabit(habit.id);

    const habitAfterFirstCall = habitStore.habits.find((h) => h.id === habit.id);
    const currentPeriodKey = periodKeyFor(habit.period, new Date());
    expect(habitAfterFirstCall?.lastCompletedPeriodKey).toBe(currentPeriodKey);

    const characterSnapshot = { ...characterStore.character };
    const bossSnapshot = { ...bossStore.boss };
    const habitSnapshot = { ...habitAfterFirstCall };

    // Second call on the same, already-completed habit — engine-level guard
    // should return early with no further state changes (no double streak
    // increment, no double boss damage, no double milestone EXP), even
    // though nothing here relies on the UI's `:disabled` binding.
    checkOffHabit(habit.id);

    const habitAfterSecondCall = habitStore.habits.find((h) => h.id === habit.id);

    expect(characterStore.character).toEqual(characterSnapshot);
    expect(bossStore.boss).toEqual(bossSnapshot);
    expect(habitAfterSecondCall).toEqual(habitSnapshot);
  });

  it('a heal with Censer of Wrath also logs the damage it dealt to the boss', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const activityLogStore = useActivityLogStore();
    const { checkOffHabit } = useCombatActions();

    const habit = { ...habitStore.addHabit('Stretch', 'daily', 'medium', false, createRng()), damageType: 'healing' as const };
    habitStore.updateHabit(habit);
    characterStore.setCharacter({ ...characterStore.character, ownedItemIds: ['censer-of-wrath'], equippedItemIds: ['censer-of-wrath'] });
    const bossHealthBefore = bossStore.boss.health;

    checkOffHabit(habit.id);

    expect(bossStore.boss.health).toBeLessThan(bossHealthBefore);
    expect(activityLogStore.entries.map((e) => e.kind)).toEqual(expect.arrayContaining(['heal', 'skill-damage']));
    expect(activityLogStore.entries.find((e) => e.kind === 'skill-damage')).toMatchObject({ isTrueDamage: true });
  });

  it('checkOffHabit returns the items dropped when completing a habit defeats the boss', () => {
    const habitStore = useHabitStore();
    const bossStore = useBossStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Slay the boss', 'daily', 'hard', false, createRng());
    habitStore.updateHabit({ ...habit, damageType: 'physical' }); // deterministic damage type
    bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 }); // one hit from defeat

    const result = checkOffHabit(habit.id);

    expect(result.itemsDropped.length).toBeGreaterThan(0);
  });

  it('a boss kill keeps the slain boss on screen for its death, names it on the drops, and holds the old level', () => {
    const habitStore = useHabitStore();
    const bossStore = useBossStore();
    const characterStore = useCharacterStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Slay the boss', 'daily', 'hard', false, createRng());
    habitStore.updateHabit({ ...habit, damageType: 'physical' });
    bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });
    const slain = bossStore.boss;
    const levelBefore = characterStore.character.level;
    characterStore.setCharacter({ ...characterStore.character, exp: expToNextLevel(levelBefore) - 1 }); // the kill's EXP levels up

    const result = checkOffHabit(habit.id);

    const { displayedBoss, heldLevel } = useCelebration();
    expect(bossStore.boss.index).toBe(slain.index + 1);
    expect(displayedBoss.value).toMatchObject({ index: slain.index, health: 0 });
    expect(result.droppedBy).toBe(PERSONALITY_NAME[slain.personality]);
    expect(characterStore.character.level).toBeGreaterThan(levelBefore);
    expect(heldLevel.value).toBe(levelBefore);
  });

  it('checkOffHabit returns no items dropped when the habit completion does not defeat the boss', () => {
    const habitStore = useHabitStore();
    const bossStore = useBossStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Meditate', 'daily', 'easy', false, createRng());
    // Comfortably above anything a single easy habit could deal, regardless
    // of the character's randomized physical/magic split (see
    // TUNING.DAMAGE_SPLIT_RATIOS) — this test only cares about the
    // no-defeat path, not damage magnitude.
    bossStore.setBoss({ ...bossStore.boss, health: 1_000_000 });

    const result = checkOffHabit(habit.id);

    expect(result.itemsDropped).toEqual([]);
  });

  it('checkMissedHabit flags the death screen instead of resetting immediately when it brings currentHealth to 0', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const { checkMissedHabit } = useCombatActions();
    const { isDead } = useDeathScreen();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });

    checkMissedHabit(habit.id);

    expect(isDead.value).toBe(true);
    // No auto-reset yet — character/boss are left exactly as the miss left them.
    expect(characterStore.character.currentHealth).toBe(0);
    expect(bossStore.boss.index).toBe(3);
  });

  it('flags the death screen when currentHealth is a tiny positive fraction that rounds to 0 (not literally 0)', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const { checkMissedHabit } = useCombatActions();
    const { isDead } = useDeathScreen();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    // Health bar already displays Math.round(currentHealth), so 0.3 reads
    // as "0 HP" even though it's not literally 0. Zero boss attack means
    // this miss deals 0 damage regardless of the crit/attack-type rng roll,
    // so currentHealth stays at exactly 0.3 — deterministic, no flakiness.
    characterStore.character = { ...characterStore.character, currentHealth: 0.3 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 0, magicAttack: 0, index: 3 });

    checkMissedHabit(habit.id);

    expect(characterStore.character.currentHealth).toBe(0.3);
    expect(isDead.value).toBe(true);
  });

  it("a skill can't be checked on a frozen day", () => {
    const habitStore = useHabitStore();
    const bossStore = useBossStore();
    const habit = habitStore.addHabit('Read', 'daily', 'medium', false, createRng());
    habitStore.updateHabit({ ...habit, streakCount: 4, frozenDayKeys: [dailyPeriodKey(useDebugClockStore().now())] });
    const bossHealth = bossStore.boss.health;

    useCombatActions().checkOffHabit(habit.id);

    expect(bossStore.boss.health).toBe(bossHealth);
    expect(habitStore.habits.find((h) => h.id === habit.id)!.streakCount).toBe(4);
  });

  it('a lethal miss raises the death screen, even with gems in hand', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    useAccountStore().addGems(50);
    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });

    useCombatActions().checkMissedHabit(habit.id);

    expect(useDeathScreen().isDead.value).toBe(true);
    expect(useAccountStore().account.gems).toBe(50);
  });

  it('every hit queued that day lands before a revive, so none meets the revived hero', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    useAccountStore().addGems(REVIVE_GEMS);
    const today = dailyPeriodKey(useDebugClockStore().now());
    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    const quest = useQuestStore().addQuest('Clean garage', 'medium', addDaysToDayKey(today, -1));
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3, doomDueDayKey: today });

    useMissedSkillsGate().queueMiss(habit, periodKeyFor('daily', useDebugClockStore().now()));
    useQuestMissGate().queueMiss(quest);
    useMissedSkillsGate().acknowledge();
    expect(useDeathScreen().isDead.value).toBe(true);
    useQuestMissGate().acknowledge();

    expect(bossStore.boss.doomDueDayKey).toBeUndefined();
    expect(useCombatActions().revive()).toBe(true);
    const revivedHealth = characterStore.character.currentHealth;
    expect(revivedHealth).toBeGreaterThan(0);
    useCombatActions().landDoom();
    expect(characterStore.character.currentHealth).toBe(revivedHealth);
  });

  it('revive spends the gems once, closes the death screen and keeps the boss', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const accountStore = useAccountStore();
    accountStore.addGems(25);
    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });
    const { checkMissedHabit, revive } = useCombatActions();
    checkMissedHabit(habit.id);

    expect(revive()).toBe(true);
    expect(revive()).toBe(false);

    expect(accountStore.account.gems).toBe(25 - REVIVE_GEMS);
    expect(useDeathScreen().isDead.value).toBe(false);
    expect(useReviveNotice().visible.value).toBe(true);
    expect(characterStore.character.currentHealth).toBeCloseTo(effectiveStat(characterStore.character, 'health') * 0.5, 5);
    expect(bossStore.boss.index).toBe(3);
    expect(useActivityLogStore().entries.filter((e) => e.kind === 'revived')).toHaveLength(1);
  });

  it('revive short on gems spends nothing and leaves the death screen up', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    useAccountStore().addGems(REVIVE_GEMS - 1);
    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });
    const { checkMissedHabit, revive } = useCombatActions();
    checkMissedHabit(habit.id);

    expect(revive()).toBe(false);
    expect(useAccountStore().account.gems).toBe(REVIVE_GEMS - 1);
    expect(useDeathScreen().isDead.value).toBe(true);
  });

  it('restart keeps a drop from a boss killed on the fatal pass, to show once the hero rises', () => {
    const characterStore = useCharacterStore();
    const { restart } = useCombatActions();
    const drops = useItemDropQueue();
    const full = ['rusty-blade', 'steel-sword', 'apprentice-wand', 'ember-heart'];
    characterStore.character = { ...characterStore.character, name: 'Aria', heroPending: false, level: 20, currentHealth: 0, equippedItemIds: full, ownedItemIds: [...full, 'soul-lantern'] };
    drops.clear();
    drops.enqueueDrops([availableRelics({ ...characterStore.character, ownedItemIds: full }).find((item) => item.id === 'soul-lantern')!]);
    useDeathScreen().triggerDeath();

    restart();

    const { ownedItemIds, equippedItemIds } = characterStore.character;
    const waiting = ownedItemIds.filter((id) => !equippedItemIds.includes(id));
    expect(waiting).toEqual(['soul-lantern']);
    expect(drops.current.value?.id).toBe('soul-lantern');
    drops.clear();
  });

  it('restart takes the death setback and keeps the run going', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const highScoreStore = useHighScoreStore();
    const { checkMissedHabit, restart } = useCombatActions();
    const { isDead } = useDeathScreen();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, name: 'Aria', heroPending: false, level: 20, currentHealth: 1, ownedItemIds: ['rusty-blade'], equippedItemIds: ['rusty-blade'], gold: 400 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 100000, magicAttack: 100000, index: 7 });
    checkMissedHabit(habit.id);
    expect(isDead.value).toBe(true);
    const shownBefore = bossNumber(bossStore.boss);
    const typesBefore = habitStore.habits.map((h) => h.damageType);
    const runsBefore = highScoreStore.topRuns.length;

    restart();

    expect(isDead.value).toBe(false);
    expect(characterStore.character.level).toBe(17);
    expect(characterStore.character.name).toBe('Aria');
    expect(characterStore.character.heroPending).toBe(false);
    expect(bossNumber(bossStore.boss)).toBe(shownBefore);
    expect(bossStore.boss.index).toBe(4);
    expect(habitStore.habits.map((h) => h.damageType)).toEqual(typesBefore);
    expect(highScoreStore.topRuns).toHaveLength(runsBefore);
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'fell', levels: 3, gold: 100, itemName: 'Rusty Hatchet' });
  });

  it('restart keeps in-progress quests, the slots and the service turn', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const questStore = useQuestStore();
    const { checkMissedHabit, restart } = useCombatActions();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    questStore.addQuest('Clean garage', 'medium', '2099-01-01');
    characterStore.character = { ...characterStore.character, currentHealth: 1, slotUpgrades: 2, serviceTurn: { id: 'reroll', startDayKey: '2026-11-01', rerolls: 3 }, gold: 500 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });
    checkMissedHabit(habit.id);

    restart();

    expect(questStore.quests).toHaveLength(1);
    expect(questStore.quests[0].description).toBe('Clean garage');
    expect(characterStore.character.slotUpgrades).toBe(2);
    expect(characterStore.character.serviceTurn).toEqual({ id: 'reroll', startDayKey: '2026-11-01', rerolls: 3 });
    expect(characterStore.character.gold).toBe(375);
  });

  it('a level-up queues no pick: the level just rises and heals', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();

    const quest = questStore.addQuest('Clean garage', 'hard', '2099-01-01');
    characterStore.character = { ...characterStore.character, exp: expToNextLevel(1) - 1 };

    completeQuest(quest.id);

    expect(characterStore.character.level).toBeGreaterThan(1);
    expect('pendingEventPicks' in characterStore.character).toBe(false);
  });

  it('prestige records the run, pays the rank and starts a new hero', () => {
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const highScoreStore = useHighScoreStore();
    const accountStore = useAccountStore();
    const { prestige } = useCombatActions();
    const { retired, clearRetired } = useRetiredHero();
    clearRetired();
    characterStore.character = { ...characterStore.character, name: 'Aria', heroPending: false, level: 30, deaths: 2 };
    bossStore.setBoss({ ...bossStore.boss, index: 14, shownIndex: 20 });
    const bossBefore = bossStore.boss;
    const gemsBefore = accountStore.account.gems;
    const runsBefore = highScoreStore.topRuns.length;
    useItemDropQueue().enqueueDrops([availableRelics(characterStore.character)[0]]);

    expect(prestige()).toBe(true);

    expect(highScoreStore.topRuns).toHaveLength(runsBefore + 1);
    expect(highScoreStore.topRuns.find((run) => run.heroName === 'Aria')).toMatchObject({ deaths: 2, prestige: 1, bossIndex: bossNumber(bossBefore), level: 30 });
    expect(accountStore.account.prestige).toBe(1);
    expect(accountStore.account.gems).toBe(gemsBefore + PRESTIGE_GEMS);
    expect(characterStore.character.name).toBeUndefined();
    expect(characterStore.character.prestige).toBe(1);
    expect(characterStore.character.level).toBe(1);
    expect(bossStore.boss.index).toBe(1);
    expect(retired.value).toEqual({ name: 'Aria', level: 30 });
    expect(useActivityLogStore().entries[0]).toMatchObject({ kind: 'prestiged', rank: 1, gems: PRESTIGE_GEMS });
    expect(useItemDropQueue().current.value).toBeNull();
    expect(useCelebration().celebrating.value).toBe(false);
    clearRetired();
  });

  it('prestige twice in a row, or below the bar, does nothing', () => {
    const characterStore = useCharacterStore();
    const accountStore = useAccountStore();
    const { prestige } = useCombatActions();
    characterStore.character = { ...characterStore.character, name: 'Aria', heroPending: false, level: 30 };
    expect(prestige()).toBe(true);
    const after = { character: characterStore.character, account: accountStore.account };
    expect(prestige()).toBe(false);
    expect(characterStore.character).toBe(after.character);
    expect(accountStore.account).toBe(after.account);

    characterStore.character = { ...characterStore.character, heroPending: false, name: 'Brand', level: 39 };
    expect(prestige()).toBe(false);
    useRetiredHero().clearRetired();
  });

  it('beginRun names the hero and gives a new run the picked hero', () => {
    const characterStore = useCharacterStore();
    const { beginRun } = useCombatActions();
    useRetiredHero().recordRetired({ name: 'Aria', level: 30 });
    characterStore.character = createCharacter(createRng(5), 'warrior');

    beginRun('Brand', 'ranger');

    expect(characterStore.character.name).toBe('Brand');
    expect(heroClassFor(characterStore.character)).toBe('ranger');
    expect(characterStore.character.heroPending).toBe(false);
    expect(useRetiredHero().retired.value).toBeNull();
  });

  it('beginRun has the hooded figure open the very first run', () => {
    const characterStore = useCharacterStore();
    const { beginRun } = useCombatActions();
    characterStore.character = createCharacter(createRng(5), 'warrior');

    beginRun('Brand', 'warrior');

    expect(useHoodedFigure().scene.value?.kind).toBe('intro');
    expect(useHoodedFigure().scene.value?.lines).toHaveLength(3);
  });

  it('beginRun has him say one return line once a run has ended', () => {
    const characterStore = useCharacterStore();
    useHighScoreStore().topRuns = [{ bossIndex: 2 } as never];
    const { beginRun } = useCombatActions();
    characterStore.character = createCharacter(createRng(5), 'warrior');

    beginRun('Brand', 'warrior');

    expect(useHoodedFigure().scene.value?.kind).toBe('back');
    expect(useHoodedFigure().scene.value?.lines).toHaveLength(1);
  });

  it('beginRun re-rolls the skills\' damage types for a different hero', () => {
    const characterStore = useCharacterStore();
    const habitStore = useHabitStore();
    const { beginRun } = useCombatActions();
    characterStore.character = createCharacter(createRng(5), 'warrior');
    for (let i = 0; i < 12; i++) habitStore.updateHabit({ ...habitStore.addHabit(`Skill ${i}`, 'daily', 'medium', false, createRng(i)), damageType: 'physical' });

    beginRun('Brand', 'cleric');

    expect(habitStore.habits).toHaveLength(12);
    expect(habitStore.habits.some((h) => h.damageType !== 'physical')).toBe(true);
  });

  it('beginRun with fate picks one of the three heroes at random', () => {
    const characterStore = useCharacterStore();
    const { beginRun } = useCombatActions();
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      characterStore.character = createCharacter(createRng(5), 'warrior');
      beginRun('Brand', 'fate');
      seen.add(heroClassFor(characterStore.character));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('prestige opens quests for the new run only when quests carried over', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { prestige } = useCombatActions();
    const climb = () => {
      characterStore.character = { ...characterStore.character, name: 'Aria', heroPending: false, level: 90 };
      expect(prestige()).toBe(true);
    };

    climb();
    expect(characterStore.character.questsUnlocked).toBe(false);

    questStore.addQuest('Clean the garage', 'hard', '2099-01-01');
    climb();
    expect(characterStore.character.questsUnlocked).toBe(true);
    useRetiredHero().clearRetired();
  });

  it('prestige records the retired run into the high-score leaderboard before resetting', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const highScoreStore = useHighScoreStore();
    const { prestige } = useCombatActions();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    characterStore.character = { ...characterStore.character, level: 31, name: 'Aldric', heroPending: false };
    bossStore.setBoss({ ...bossStore.boss, index: 3, personality: 'brute4x' });
    const characterAtEnd = characterStore.character;
    const habitAtEnd = habitStore.habits.find((h) => h.id === habit.id)!;

    prestige();

    expect(highScoreStore.topRuns).toHaveLength(1);
    const run = highScoreStore.topRuns[0];
    expect(run.bossIndex).toBe(3); // the boss being fought, not the new run's 1
    expect(run.level).toBe(31);
    expect(run.habits).toEqual([
      {
        name: 'Exercise',
        period: 'daily',
        damageType: habitAtEnd.damageType,
        isBad: false,
        streakCount: habitAtEnd.streakCount,
        rank: habitAtEnd.rank ?? 0,
      },
    ]);
    expect(run.items).toEqual([]);
    expect(run.stats.health).toBeGreaterThan(0);
    expect(run.heroName).toBe('Aldric');
    expect(run.heroClass).toBe(heroClassFor(characterAtEnd));
    expect(run.bossPersonality).toBe('brute4x');
    useRetiredHero().clearRetired();
  });

  it('checkOffHabit on a bad habit damages the player (penalty), resets its streak, and stamps completed', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Skip dessert', 'daily', 'medium', true, createRng());
    habitStore.updateHabit({ ...habit, streakCount: 4 });
    const healthBefore = characterStore.character.currentHealth;
    const bossHealthBefore = bossStore.boss.health;

    const result = checkOffHabit(habit.id);

    const currentPeriodKey = periodKeyFor(habit.period, new Date());
    const updatedHabit = habitStore.habits.find((h) => h.id === habit.id);

    expect(characterStore.character.currentHealth).toBeLessThan(healthBefore);
    expect(bossStore.boss.health).toBe(bossHealthBefore); // tapping a bad habit never damages the boss
    expect(updatedHabit?.streakCount).toBe(0); // doing the bad thing resets the avoidance streak
    expect(updatedHabit?.lastCompletedPeriodKey).toBe(currentPeriodKey);
    expect(result.itemsDropped).toEqual([]);
  });

  it('checkOffHabit is a no-op the second time on a bad habit already resolved this period', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const { checkOffHabit } = useCombatActions();

    const habit = habitStore.addHabit('Skip dessert', 'daily', 'medium', true, createRng());
    checkOffHabit(habit.id);
    const healthAfterFirstCall = characterStore.character.currentHealth;

    checkOffHabit(habit.id);

    expect(characterStore.character.currentHealth).toBe(healthAfterFirstCall);
  });

  it('checkOffHabit on a bad habit can flag the death screen, same as a good habit miss', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const { checkOffHabit } = useCombatActions();
    const { isDead } = useDeathScreen();

    const habit = habitStore.addHabit('Skip dessert', 'daily', 'hard', true, createRng());
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000 });

    checkOffHabit(habit.id);

    expect(isDead.value).toBe(true);
  });

  it('checkAvoidedHabit rewards the player by damaging the boss and increments the avoidance streak', () => {
    const habitStore = useHabitStore();
    const bossStore = useBossStore();
    const { checkAvoidedHabit } = useCombatActions();

    const habit = habitStore.addHabit('Skip dessert', 'daily', 'medium', true, createRng());
    habitStore.updateHabit({ ...habit, damageType: 'physical' }); // deterministic damage type
    // High enough that this single hit can't defeat/respawn the boss — this
    // test is about the damage-dealt/streak assertions below, not defeat.
    bossStore.setBoss({ ...bossStore.boss, health: 1_000_000, maxHealth: 1_000_000 });
    const bossHealthBefore = bossStore.boss.health;

    const result = checkAvoidedHabit(habit.id);

    const updatedHabit = habitStore.habits.find((h) => h.id === habit.id);
    expect(bossStore.boss.health).toBeLessThan(bossHealthBefore);
    expect(updatedHabit?.streakCount).toBe(1);
    expect(updatedHabit?.lastCompletedPeriodKey).toBeNull(); // a rollover resolution is never an active tap
    expect(result.itemsDropped).toEqual([]);
  });

  it('completeQuest grants the slot-1 weekly-curve EXP, logs quest-completed, and checks the quest off for today', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();
    const activityLogStore = useActivityLogStore();

    const quest = questStore.addQuest('Clean garage', 'medium', '2026-02-01');
    const { exp, level } = characterStore.character;

    const result = completeQuest(quest.id);

    const expected = questSlotExp(level, 'medium', 0);
    expect(expected).toBeLessThan(expToNextLevel(level)); // well under one level at level 1
    expect(result).toEqual({ amount: expected });
    expect(characterStore.character.exp).toBeCloseTo(exp + expected, 10);
    expect(questStore.quests).toEqual([{ ...quest, doneDayKey: dailyPeriodKey(useDebugClockStore().now()) }]);
    expect(activityLogStore.entries[0]).toMatchObject({ kind: 'quest-completed', description: 'Clean garage', amount: expected });
  });

  it('each further regular completion in the same calendar week takes the next slot', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();
    // Level 20 keeps three quests' worth of EXP from levelling the character mid-test.
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };

    characterStore.character = { ...characterStore.character, questWeek: { weekKey: weeklyPeriodKey(useDebugClockStore().now()), completed: 4 } };

    const amounts = [1, 2, 3].map((n) => completeQuest(questStore.addQuest(`Quest ${n}`, 'medium', '2099-01-01').id)?.amount);

    expect(amounts).toEqual([questSlotExp(20, 'medium', 4), questSlotExp(20, 'medium', 5), questSlotExp(20, 'medium', 6)]);
    expect(amounts[0]!).toBeGreaterThan(amounts[1]!);
    expect(amounts[1]!).toBeGreaterThan(amounts[2]!);
    expect(characterStore.character.questWeek).toEqual({ weekKey: weeklyPeriodKey(useDebugClockStore().now()), completed: 7 });
  });

  it('slot 12 and beyond pays nothing but still completes the quest', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, questWeek: { weekKey: weeklyPeriodKey(useDebugClockStore().now()), completed: 11 } };
    const expBefore = characterStore.character.exp;

    const result = completeQuest(questStore.addQuest('Late one', 'hard', '2099-01-01').id);

    expect(result?.amount).toBe(0);
    expect(characterStore.character.exp).toBe(expBefore);
    expect(questStore.quests[0].doneDayKey).toBeDefined();
  });

  it('a new calendar week starts back at slot 1', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const clock = useDebugClockStore();
    const { completeQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };

    completeQuest(questStore.addQuest('This week', 'medium', '2099-01-01').id);
    clock.offsetMs += 7 * 24 * 60 * 60 * 1000;
    const next = completeQuest(questStore.addQuest('Next week', 'medium', '2099-01-01').id);

    expect(next?.amount).toBe(questSlotExp(20, 'medium', 0));
    expect(characterStore.character.questWeek).toEqual({ weekKey: weeklyPeriodKey(clock.now()), completed: 1 });
  });

  it('a failed quest does not consume a slot', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest, failQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };

    failQuest(questStore.addQuest('Missed', 'easy', '2026-02-01').id);
    expect(characterStore.character.questWeek).toBeUndefined();
    const result = completeQuest(questStore.addQuest('Done', 'medium', '2099-01-01').id);

    expect(result?.amount).toBe(questSlotExp(20, 'medium', 0));
  });

  it('completeQuest on an overdue regular quest pays half the next slot and takes none', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest, failQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };
    const weekKey = weeklyPeriodKey(useDebugClockStore().now());
    characterStore.character = { ...characterStore.character, questWeek: { weekKey, completed: 2 } };

    const quest = questStore.addQuest('Late one', 'medium', '2026-02-01');
    failQuest(quest.id);
    const result = completeQuest(quest.id);

    expect(result).toEqual({ amount: questSlotExp(20, 'medium', 2) / 2 });
    expect(characterStore.character.questWeek).toEqual({ weekKey, completed: 2 });
    expect(questStore.quests[0]).toMatchObject({ overdue: true, doneDayKey: dailyPeriodKey(useDebugClockStore().now()) });
  });

  it('an old side quest, once migrated, pays like a regular quest: half EXP and no slot when overdue', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };
    questStore.initFromSave([
      { id: 'old', kind: 'side', description: 'Slay it', difficulty: 'hard', dueDateKey: '2026-02-01', overdue: true, rewardItemId: 'ember-heart' },
    ] as unknown as Quest[]);

    const result = completeQuest('old');

    expect(result).toEqual({ amount: questSlotExp(20, 'hard', 0) / 2 });
    expect(characterStore.character.questWeek).toBeUndefined();
    expect(characterStore.character.ownedItemIds).not.toContain('ember-heart');
    expect(characterStore.character.earnedRelicIds ?? []).toEqual([]);
  });

  it('an old on-time side quest, once migrated, pays the next slot and takes it', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();
    characterStore.character = { ...characterStore.character, level: 20, exp: 0 };
    questStore.initFromSave([
      { id: 'old', kind: 'side', description: 'Slay it', difficulty: 'medium', dueDateKey: '2099-01-01', rewardItemId: 'ember-heart' },
    ] as unknown as Quest[]);

    const result = completeQuest('old');

    expect(result).toEqual({ amount: questSlotExp(20, 'medium', 0) });
    expect(characterStore.character.questWeek?.completed).toBe(1);
    // Its relic is back in the pool: nothing promises it.
    expect(availableRelics(characterStore.character).map((i) => i.id)).toContain('ember-heart');
  });

  it('completeQuest is a no-op for a quest already checked off', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { completeQuest } = useCombatActions();

    const quest = questStore.addQuest('Clean garage', 'medium', '2099-01-01');
    completeQuest(quest.id);
    const expAfterFirst = characterStore.character.exp;

    expect(completeQuest(quest.id)).toBeNull();
    expect(characterStore.character.exp).toBe(expAfterFirst);
  });

  it('completeQuest is a no-op for an id that is not in the quest store', () => {
    const characterStore = useCharacterStore();
    const { completeQuest } = useCombatActions();
    const expBefore = characterStore.character.exp;

    completeQuest('does-not-exist');

    expect(characterStore.character.exp).toBe(expBefore);
  });

  it('failQuest hits the character like a missed daily, logs quest-failed, and flags the quest overdue', () => {
    const characterStore = useCharacterStore();
    const questStore = useQuestStore();
    const { failQuest } = useCombatActions();
    const activityLogStore = useActivityLogStore();

    const quest = questStore.addQuest('Clean garage', 'medium', '2026-02-01');
    const healthBefore = characterStore.character.currentHealth;

    failQuest(quest.id);

    expect(characterStore.character.currentHealth).toBeLessThan(healthBefore);
    expect(questStore.quests).toEqual([{ ...quest, overdue: true }]);
    expect(activityLogStore.entries[0]).toMatchObject({ kind: 'quest-failed', description: 'Clean garage', attackType: expect.stringMatching(/^(physical|magic)$/) });
  });

  it('failQuest flags the death screen instead of resetting immediately when it brings currentHealth to 0', () => {
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const questStore = useQuestStore();
    const { failQuest } = useCombatActions();
    const { isDead } = useDeathScreen();

    const quest = questStore.addQuest('Clean garage', 'hard', '2026-02-01');
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 10000, magicAttack: 10000 });

    failQuest(quest.id);

    expect(isDead.value).toBe(true);
  });

  it('restart() leaves pending quests untouched — same precedent as habit streaks, which also survive a death/reset', () => {
    const habitStore = useHabitStore();
    const characterStore = useCharacterStore();
    const bossStore = useBossStore();
    const questStore = useQuestStore();
    const { checkMissedHabit, restart } = useCombatActions();
    const { isDead } = useDeathScreen();

    const habit = habitStore.addHabit('Exercise', 'daily', 'hard', false, createRng());
    const quest = questStore.addQuest('Clean garage', 'medium', '2026-02-01');
    characterStore.character = { ...characterStore.character, currentHealth: 1 };
    bossStore.setBoss({ ...bossStore.boss, physicalAttack: 1000, magicAttack: 1000, index: 3 });
    checkMissedHabit(habit.id);
    expect(isDead.value).toBe(true);

    restart();

    expect(characterStore.character.deaths).toBe(1); // sanity: the setback happened
    expect(questStore.quests).toEqual([quest]); // the pending quest is untouched by the reset
  });

  it('addHabit stamps lastCheckedPeriodKey so a brand-new habit is not a false miss on the next rollover', () => {
    const habitStore = useHabitStore();
    const { addHabit } = useCombatActions();

    const daily = addHabit('Meditate', 'daily', 'medium', false);
    const weekly = addHabit('Prayer list', 'weekly', 'medium', false);

    const now = new Date();
    expect(habitStore.habits.find((h) => h.id === daily.id)?.lastCheckedPeriodKey).toBe(periodKeyFor('daily', now));
    expect(habitStore.habits.find((h) => h.id === weekly.id)?.lastCheckedPeriodKey).toBe(periodKeyFor('weekly', now));
  });

  describe('set days', () => {
    const today = dayOfWeekIndex(new Date());
    const notToday = (today + 1) % 7;

    it('checkOffHabit does nothing on a rest day', () => {
      const habitStore = useHabitStore();
      const bossStore = useBossStore();
      const { addHabit, checkOffHabit } = useCombatActions();
      const habit = addHabit('Gym', 'daily', 'medium', false, [notToday]);
      const bossHealth = bossStore.boss.health;
      checkOffHabit(habit.id);
      expect(habitStore.habits[0].lastCompletedPeriodKey).toBeNull();
      expect(bossStore.boss.health).toBe(bossHealth);
    });

    it('activateOverdrive is refused once today is taken out of a checked-off habit', () => {
      const habitStore = useHabitStore();
      const { addHabit, checkOffHabit, activateOverdrive } = useCombatActions();
      const habit = addHabit('Gym', 'daily', 'medium', false);
      habitStore.updateHabit({ ...habitStore.habits[0], isOverdrive: true });
      checkOffHabit(habit.id);
      habitStore.setHabitDays(habit.id, [notToday]);
      activateOverdrive(habit.id);
      expect(habitStore.habits[0].overdriveUsesThisPeriod ?? 0).toBe(0);
    });

    it('addHabit stamps the day it was added', () => {
      const { addHabit } = useCombatActions();
      expect(addHabit('Gym', 'daily', 'hard', false).createdDayKey).toBe(dailyPeriodKey(useDebugClockStore().now()));
    });

    it('addHabit stores days on a daily', () => {
      const { addHabit } = useCombatActions();
      expect(addHabit('Gym', 'daily', 'hard', false, [0, 2, 5]).days).toEqual([0, 2, 5]);
    });
  });

  describe('skill and kill EXP', () => {
    it('checking off the only daily pays a fifth of a level; Overdrive pays none', () => {
      const characterStore = useCharacterStore();
      const bossStore = useBossStore();
      const habitStore = useHabitStore();
      const { addHabit, checkOffHabit, activateOverdrive } = useCombatActions();
      bossStore.setBoss({ ...bossStore.boss, health: 1e9, maxHealth: 1e9 });
      const habit = addHabit('Gym', 'daily', 'medium', false);
      habitStore.updateHabit({ ...habitStore.habits[0], isOverdrive: true });

      checkOffHabit(habit.id);
      expect(characterStore.character.exp).toBeCloseTo(expToNextLevel(1) * 0.2, 10);
      activateOverdrive(habit.id);
      expect(characterStore.character.exp).toBeCloseTo(expToNextLevel(1) * 0.2, 10);
    });

    it('a kill logs the EXP the engine paid at the slayer\'s level', () => {
      const characterStore = useCharacterStore();
      const bossStore = useBossStore();
      const { addHabit, checkOffHabit } = useCombatActions();
      characterStore.character = { ...characterStore.character, level: 10, exp: 0 };
      bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });
      const habit = addHabit('Gym', 'daily', 'medium', false);

      checkOffHabit(habit.id);
      const entry = useActivityLogStore().entries.find((e) => e.kind === 'boss-defeated');
      const amount = (entry as { amount: number }).amount;
      expect(amount).toBeGreaterThanOrEqual(expToNextLevel(10) * 0.4 * 0.9);
      expect(amount).toBeLessThanOrEqual(expToNextLevel(10) * 0.4 * 1.1);
      expect(characterStore.character.exp).toBeCloseTo(expToNextLevel(10) * 0.2 + amount, 10);
    });
  });

  describe('Special and Ult handed out', () => {
    function readyToLevel(level: number) {
      const characterStore = useCharacterStore();
      const bossStore = useBossStore();
      characterStore.character = { ...characterStore.character, level, exp: expToNextLevel(level) - 0.001 };
      bossStore.setBoss({ ...bossStore.boss, health: 1e9, maxHealth: 1e9 });
      return useCombatActions();
    }

    it('a level-up to 5 gives a daily skill the Special and logs it', () => {
      const { addHabit, checkOffHabit } = readyToLevel(4);
      const habit = addHabit('Gym', 'daily', 'medium', false);
      expect(useHabitStore().habits[0].isSpecial).toBeFalsy();
      checkOffHabit(habit.id);
      expect(useCharacterStore().character.level).toBe(5);
      expect(useHabitStore().habits[0].isSpecial).toBe(true);
      expect(useActivityLogStore().entries.some((e) => e.kind === 'special-assigned' && e.habitName === 'Gym')).toBe(true);
    });

    it('a level-up to 8 gives a weekly skill the Ult', () => {
      const { addHabit, checkOffHabit } = readyToLevel(7);
      const habit = addHabit('Long run', 'weekly', 'medium', false);
      checkOffHabit(habit.id);
      expect(useCharacterStore().character.level).toBe(8);
      expect(useHabitStore().habits[0].isUlt).toBe(true);
      expect(useActivityLogStore().entries.some((e) => e.kind === 'ult-assigned')).toBe(true);
    });

    it('a daily skill added after level 5 takes the Special that had nothing to land on', () => {
      const characterStore = useCharacterStore();
      characterStore.character = { ...characterStore.character, level: 8 };
      const { addHabit } = useCombatActions();
      addHabit('Long run', 'weekly', 'medium', false);
      expect(useHabitStore().habits.some((h) => h.isSpecial)).toBe(false);
      expect(useHabitStore().habits[0].isUlt).toBe(true);
      addHabit('Gym', 'daily', 'medium', false);
      const gym = useHabitStore().habits.find((h) => h.name === 'Gym')!;
      expect(gym.isSpecial).toBe(true);
      expect(useHabitStore().habits.find((h) => h.name === 'Long run')!.isSpecial).toBeFalsy();
    });
  });

  describe('rank-up log', () => {
    function checkOff(overrides: Partial<Habit>) {
      const bossStore = useBossStore();
      const habitStore = useHabitStore();
      const { addHabit, checkOffHabit } = useCombatActions();
      bossStore.setBoss({ ...bossStore.boss, health: 1e9, maxHealth: 1e9 });
      const habit = addHabit('Run', 'daily', 'medium', false);
      habitStore.updateHabit({ ...habitStore.habits[0], ...overrides });
      checkOffHabit(habit.id);
      return useActivityLogStore().entries;
    }

    it('logs a rank-up above the skill\'s own entry', () => {
      const entries = checkOff({ streakCount: 9, rank: 0, damageType: 'physical' });
      expect(entries[0]).toMatchObject({ kind: 'rank-up', habitName: 'Run', rank: 1 });
      expect(entries[1]).toMatchObject({ kind: 'skill-damage', habitName: 'Run' });
    });

    it('logs nothing while a ranked skill rebuilds its streak', () => {
      expect(checkOff({ streakCount: 29, rank: 3, damageType: 'physical' }).some((e) => e.kind === 'rank-up')).toBe(false);
    });

    it('logs the next rank once the streak passes it', () => {
      // Streak 50 is also a milestone, so a level-up may land above it.
      expect(checkOff({ streakCount: 49, rank: 3, damageType: 'physical' }).find((e) => e.kind === 'rank-up')).toMatchObject({ rank: 4 });
    });
  });

  describe('trials', () => {
    const dayKey = () => dailyPeriodKey(useDebugClockStore().now());

    function take(id: TrialSetId, overrides: Partial<TrialEntry> = {}) {
      const characterStore = useCharacterStore();
      const entry: TrialEntry = { id, takenDayKey: dayKey(), count: 0, ...overrides };
      characterStore.setCharacter({ ...characterStore.character, level: 20, exp: 0, trials: [...(characterStore.character.trials ?? []), entry] });
    }

    const entryOf = (id: TrialSetId) => useCharacterStore().character.trials?.find((e) => e.id === id);

    function strikeHabit(overrides: Partial<Habit> = {}) {
      const habitStore = useHabitStore();
      const habit = habitStore.addHabit('Lift', 'daily', 'hard', false, createRng());
      habitStore.updateHabit({ ...habit, damageType: 'physical', ...overrides });
      return habit;
    }

    afterEach(() => {
      const { dismiss, current } = useItemDropQueue();
      while (current.value) dismiss();
      const completions = useQuestCompleteQueue();
      while (completions.current.value) completions.dismiss();
    });

    it('a live crit counts toward Crits landed', () => {
      const characterStore = useCharacterStore();
      const bossStore = useBossStore();
      take('crits');
      characterStore.setCharacter({ ...characterStore.character, critChance: 1 });
      bossStore.setBoss({ ...bossStore.boss, health: 100000, maxHealth: 100000 });

      useCombatActions().checkOffHabit(strikeHabit().id);

      expect(entryOf('crits')?.count).toBe(1);
    });

    it('a kill with no hit taken counts toward Bosses slain and Untouched kills, but pays nothing until claimed', () => {
      const bossStore = useBossStore();
      take('bosses');
      take('untouched');
      bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0, hurtPlayer: undefined });

      useCombatActions().checkOffHabit(strikeHabit().id);

      expect(entryOf('bosses')?.count).toBe(1);
      expect(entryOf('untouched')?.count).toBe(1);
      expect(useAccountStore().account.gems).toBe(0);
      expect(useActivityLogStore().entries.find((e) => e.kind === 'challenge-completed')).toBeUndefined();
      expect(useQuestCompleteQueue().current.value).toBeNull();
    });

    it("claiming pays the rung's gems, its gold at the current boss, and medium EXP, using no weekly slot, once", () => {
      const characterStore = useCharacterStore();
      const bossStore = useBossStore();
      take('bosses', { count: 1 });
      bossStore.setBoss({ ...bossStore.boss, index: 10 });
      characterStore.setCharacter({ ...characterStore.character, gold: 0, prestige: 2 });
      const questWeekBefore = characterStore.character.questWeek;
      const { claimTrial } = useCombatActions();

      claimTrial('bosses');
      claimTrial('bosses');

      expect(entryOf('bosses')?.claimed).toEqual([0]);
      expect(useAccountStore().account.gems).toBe(4);
      expect(characterStore.character.gold).toBe(goldPrice(0.5, 10, 2));
      expect(characterStore.character.questWeek).toBe(questWeekBefore);
      const logged = useActivityLogStore().entries.filter((e) => e.kind === 'challenge-completed');
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatchObject({ name: 'Bosses slain: Slay a boss', amount: questSlotExp(20, 'medium', 0), gems: 4, gold: goldPrice(0.5, 10, 2) });
      expect(useQuestCompleteQueue().current.value).toMatchObject({ description: 'Slay a boss', difficulty: 'medium', amount: questSlotExp(20, 'medium', 0) });
    });

    it('a rung with no gold pays no gold', () => {
      const characterStore = useCharacterStore();
      take('crits', { count: 5 });
      characterStore.setCharacter({ ...characterStore.character, gold: 0 });
      useCombatActions().claimTrial('crits');
      expect(characterStore.character.gold).toBe(0);
      expect(useActivityLogStore().entries.find((e) => e.kind === 'challenge-completed')).not.toHaveProperty('gold');
    });

    it('claiming a set with nothing waiting, or one not held, does nothing', () => {
      const characterStore = useCharacterStore();
      take('untouched');
      const before = characterStore.character;

      useCombatActions().claimTrial('untouched');
      useCombatActions().claimTrial('resisted');

      expect(characterStore.character).toBe(before);
    });

    it('a kill of a boss that already hurt the player leaves Untouched kills where it was', () => {
      const bossStore = useBossStore();
      take('untouched');
      bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0, hurtPlayer: true });
      useCombatActions().checkOffHabit(strikeHabit().id);
      expect(entryOf('untouched')?.count).toBe(0);
    });

    it('a kill with a true damage skill marks True strike in Feats', () => {
      const bossStore = useBossStore();
      take('feats');
      bossStore.setBoss({ ...bossStore.boss, health: 0.0001, armor: 0 });
      useCombatActions().checkOffHabit(strikeHabit({ damageType: 'trueDamage' }).id);
      expect(entryOf('feats')?.marks).toContain('true-kill');
    });

    it('a bad-habit check notes the day, and a good habit does not', () => {
      const habitStore = useHabitStore();
      const characterStore = useCharacterStore();
      const { checkOffHabit } = useCombatActions();
      checkOffHabit(strikeHabit().id);
      expect(characterStore.character.lastBadCheckDayKey).toBeUndefined();

      const bad = habitStore.addHabit('Doomscroll', 'daily', 'easy', true, createRng());
      checkOffHabit(bad.id);
      expect(characterStore.character.lastBadCheckDayKey).toBe(dayKey());
    });

    it('resisting a bad habit counts toward Bad habits resisted', () => {
      const habitStore = useHabitStore();
      take('resisted');
      const bad = habitStore.addHabit('Doomscroll', 'daily', 'easy', true, createRng());
      useCombatActions().checkAvoidedHabit(bad.id);
      expect(entryOf('resisted')?.count).toBe(1);
    });

    it('a skill rank-up counts toward Skill ranks raised, and a check lifts Longest streak', () => {
      take('ranks');
      take('streak');
      useCombatActions().checkOffHabit(strikeHabit({ streakCount: 9, rank: 0 }).id);
      expect(entryOf('ranks')?.count).toBe(1);
      expect(entryOf('streak')?.count).toBe(10);
    });

    it('a check that reaches a rung is not offered to Undo', () => {
      const { checkOffHabit } = useCombatActions();
      checkOffHabit(strikeHabit({ streakCount: 0 }).id);
      expect(useUndoCheck().canUndo()).toBe(true); // a plain check is offered

      take('ranks');
      checkOffHabit(strikeHabit({ streakCount: 9, rank: 0 }).id);
      expect(entryOf('ranks')?.count).toBe(1);
      expect(useUndoCheck().canUndo()).toBe(false);
    });

    it('addHabit and addQuest queue First steps additions, and addQuest stamps the day', () => {
      take('first-steps');
      const { addHabit, addQuest } = useCombatActions();

      const habit = addHabit('Stretch', 'daily', 'easy', false);
      const quest = addQuest('Clean garage', 'medium', '2099-01-01');

      expect(quest.createdDayKey).toBe(dayKey());
      expect(useQuestStore().quests).toEqual([quest]);
      expect(entryOf('first-steps')?.pending).toEqual([
        { id: habit.id, dayKey: dayKey(), mark: 'good-skill' },
        { id: quest.id, dayKey: dayKey(), mark: 'quest' },
      ]);
    });

    it('completing a quest on time counts toward Quests completed only when it survived a day', () => {
      take('quests');
      const questStore = useQuestStore();
      const { completeQuest } = useCombatActions();
      const fresh = questStore.addQuest('Today', 'easy', '2099-01-01', dayKey());
      const old = questStore.addQuest('Older', 'easy', '2099-01-01', addDaysToDayKey(dayKey(), -1));
      const legacy = questStore.addQuest('Legacy', 'easy', '2099-01-01');

      completeQuest(fresh.id);
      expect(entryOf('quests')?.count).toBe(0);
      completeQuest(old.id);
      completeQuest(legacy.id);
      expect(entryOf('quests')?.count).toBe(2);
    });

    it('an overdue quest completion does not count toward Quests completed', () => {
      take('quests');
      const questStore = useQuestStore();
      const { completeQuest, failQuest } = useCombatActions();
      const quest = questStore.addQuest('Late', 'easy', '2026-02-01');
      failQuest(quest.id);
      completeQuest(quest.id);
      expect(entryOf('quests')?.count).toBe(0);
    });

    it('a character with no trials goes through every hook untouched', () => {
      const characterStore = useCharacterStore();
      const habitStore = useHabitStore();
      const { checkOffHabit, checkAvoidedHabit, addHabit, addQuest, completeQuest, reportTrial } = useCombatActions();
      expect(characterStore.character.trials).toBeUndefined();

      const good = addHabit('Stretch', 'daily', 'easy', false);
      const bad = addHabit('Doomscroll', 'daily', 'easy', true);
      checkOffHabit(good.id);
      checkAvoidedHabit(bad.id);
      completeQuest(addQuest('Q', 'easy', '2099-01-01').id);
      reportTrial({ type: 'rank-up' });

      expect(characterStore.character.trials).toBeUndefined();
      expect(habitStore.habits).toHaveLength(2);
    });
  });
});
