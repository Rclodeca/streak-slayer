// Composable exposing user-triggered combat actions: checking off a habit,
// marking one missed (used directly and by `useDailyRollover`), adding new
// habits, and restarting after death.
//
// Orchestration rule: `completeHabit`/`missHabit`/`resolveBossDefeatIfDead`/
// `resolvePlayerDeathIfDead` each touch up to three stores' worth of state
// from a single call. To guarantee every game-engine combat function runs
// exactly once per user action, this composable calls the RAW game-engine
// functions (imported directly from `../game-engine`, never a store's own
// domain-specific wrapper action) and writes each single result back into
// all affected stores via their plain setters (`setCharacter`, `setBoss`,
// `updateHabit`, `setHabits`). This keeps all three stores consistent with
// one authoritative result instead of re-deriving state per store.
//
// Death is a two-step handoff to the UI rather than an automatic reset:
// `checkMissedHabit` only detects currentHealth <= 0 and flags it via
// `useDeathScreen().triggerDeath()`; the actual character/boss/habit reset
// happens in `restart()`, called once the player dismisses the death popup.
//
// Bad habits invert which trigger resolves which outcome (see `Habit.isBad`
// in types.ts): checking one off resolves the *penalty* (`missHabit` —
// damage to the player) instead of the reward, and `checkAvoidedHabit`
// (called by `useMissedSkillsGate` when a rollover finds one un-checked, i.e.
// avoided) resolves the *reward* (`completeHabit` — damage to the boss)
// instead of the penalty. `applyReward`/`applyPenalty` below are the shared
// engine-invoking cores; the four public functions just wire each trigger to
// the right one and decide whether to stamp `lastCompletedPeriodKey` (only
// on a live tap, never on a rollover resolution).

import {
  addExpAndResolveLevelUps,
  bossArt,
  applyChallengeEvent,
  chooseHero,
  claimableChallenges,
  completeHabit,
  createRng,
  dailyPeriodKey,
  DEFAULT_HERO_NAME,
  effectiveCritChance,
  effectiveStat,
  describeItemBonus,
  doneChallenges,
  getChallengeDef,
  markChallengeClaimed,
  milestoneTrial,
  HERO_CLASSES,
  heroClassFor,
  ITEM_CATALOG,
  isDueOn,
  itemDoubleFactor,
  missHabit,
  missQuest,
  overdriveHabit,
  overdriveUsesRemaining,
  periodKeyFor,
  PERSONALITY_NAME,
  pickRandom,
  questOverdueExp,
  questRewardExp,
  questWeekFor,
  recordBadCheck,
  recordQuestCompletion,
  resolveBossDefeatIfDead,
  resolveDoom,
  resolvePlayerDeathIfDead,
  reviveWithFeatherIfEquipped,
  skillCompletionExp,
  unlockQuests,
  weeklyPeriodKey,
} from '../game-engine';
import type { Boss, Character, ChallengeEntry, ChallengeEvent, ChallengeId, Difficulty, FiredBossSkill, Habit, HeroClass, ItemDef, Period, Quest } from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useHighScoreStore } from '../store/highScoreStore';
import { useQuestStore } from '../store/questStore';
import { useCelebration } from './useCelebration';
import { useDeathScreen } from './useDeathScreen';
import { useFallenHero } from './useFallenHero';
import { useHoodedFigure } from './useHoodedFigure';
import { useBossSkillCard } from './useBossSkillCard';
import { playHit } from './useHitFeed';
import { useItemDropQueue } from './useItemDropQueue';
import { useQuestCompleteQueue } from './useQuestCompleteQueue';
import { useReviveNotice } from './useReviveNotice';
import { useUndoCheck } from './useUndoCheck';

/** What a reward resolved to: any boss-kill drops, and the name of the boss that dropped them. */
/** A pick on the new-hero screen: one of the heroes, or Fate for a random one. */
export type HeroPick = HeroClass | 'fate';

export interface RewardResult {
  itemsDropped: ItemDef[];
  droppedBy?: string;
}

// Shared across calls made through this composable. This is app runtime
// code (not `game-engine/`), so an unseeded Math.random()-backed Rng is
// acceptable here.
const rng = createRng();

export function useCombatActions() {
  const characterStore = useCharacterStore();
  const bossStore = useBossStore();
  const habitStore = useHabitStore();
  const activityLogStore = useActivityLogStore();
  const questStore = useQuestStore();
  const debugClockStore = useDebugClockStore();
  const highScoreStore = useHighScoreStore();
  const { triggerDeath, dismiss: dismissDeathScreen } = useDeathScreen();
  const { recordFallen, clearFallen } = useFallenHero();
  const { startScene } = useHoodedFigure();
  const { showReviveNotice } = useReviveNotice();
  const { enqueueDrops, clear: clearItemDrops } = useItemDropQueue();
  const { enqueue: enqueueCompletion } = useQuestCompleteQueue();
  const { celebrateBossKill, celebrateLevelUp, clear: clearCelebration } = useCelebration();
  const { showBossSkill, clear: clearBossSkills } = useBossSkillCard();
  const undoCheck = useUndoCheck();

  /**
   * Writes a `level-up` log entry and queues the hero panel's level-up beat
   * if `after` is at a higher level than `before` — a no-op otherwise. Stat
   * deltas are derived (rather than carried on the level-up result itself)
   * since `addExpAndResolveLevelUps` only returns the count of levels gained,
   * not the resulting stat values.
   */
  function logLevelUpIfAny(before: Character, after: Character): void {
    if (after.level <= before.level) return;
    celebrateLevelUp(before.level);
    activityLogStore.addEntry({
      kind: 'level-up',
      newLevel: after.level,
      // Isolates the level-up heal (TUNING.LEVEL_UP_HEAL_PCT + lifesteal%,
      // see addExpAndResolveLevelUps): nothing else changes currentHealth
      // between these two specific snapshots.
      healthRestored: after.currentHealth - before.currentHealth,
      statDeltas: {
        physicalDamage: effectiveStat(after, 'physicalDamage') - effectiveStat(before, 'physicalDamage'),
        magicDamage: effectiveStat(after, 'magicDamage') - effectiveStat(before, 'magicDamage'),
        healing: effectiveStat(after, 'healing') - effectiveStat(before, 'healing'),
        health: effectiveStat(after, 'health') - effectiveStat(before, 'health'),
        trueDamage: effectiveStat(after, 'trueDamage') - effectiveStat(before, 'trueDamage'),
      },
    });
  }

  /** Logs a boss skill a blow made fire; a landed Wounds keeps its familiar entry. */
  function logBossSkill(fired: FiredBossSkill): void {
    if (fired.skill === 'wounds' && fired.outcome === 'landed') {
      activityLogStore.addEntry({ kind: 'wounds-applied', durationDays: TUNING.BOSS_SKILLS.DURATION_DAYS, effectRate: TUNING.BOSS_SKILLS.WOUNDS_EFFECT_RATE });
      return;
    }
    activityLogStore.addEntry({ kind: 'boss-skill', skill: fired.skill, outcome: fired.outcome, ...(fired.amount !== undefined && { amount: fired.amount }), ...(fired.pct !== undefined && { pct: fired.pct }), ...(fired.stat !== undefined && { stat: fired.stat }) });
  }

  /** Queues one event pick per level gained; the player resolves them in EventChoiceModal. */
  function grantEventPicks(levelsGained: number): void {
    if (levelsGained <= 0) return;
    const character = characterStore.character;
    characterStore.setCharacter({ ...character, pendingEventPicks: (character.pendingEventPicks ?? 0) + levelsGained });
  }

  /**
   * Pays one finished challenge: its reserved relic (a relic already owned
   * still finishes the challenge, just without the item), and EXP as a medium
   * quest at the current weekly slot — without using that slot up.
   */
  function payChallenge(entry: ChallengeEntry): void {
    const def = getChallengeDef(entry.id);
    const item = characterStore.grantItem(entry.relicId);
    if (item) enqueueDrops([item]);

    const before = characterStore.character;
    const week = questWeekFor(before.questWeek, weeklyPeriodKey(debugClockStore.now()));
    const amount = questRewardExp(before, 'medium', week.completed);
    const { character, levelsGained } = addExpAndResolveLevelUps(before, amount);
    logLevelUpIfAny(before, character);
    characterStore.setCharacter(character);
    grantEventPicks(levelsGained);

    activityLogStore.addEntry({ kind: 'challenge-completed', name: def.name, amount, ...(item && { itemName: item.name }) });
    enqueueCompletion({ description: def.name, difficulty: 'medium', amount });
  }

  /**
   * Feeds one happening to the character's challenges; a finished one waits
   * to be claimed (claimChallenge). A no-op for a character with no
   * challenges. Reads the character fresh, so call it between steps that
   * already wrote theirs back.
   */
  function reportChallenge(event: ChallengeEvent, todayKey: string = dailyPeriodKey(debugClockStore.now())): void {
    const result = applyChallengeEvent(characterStore.character, event, todayKey);
    if (result.character === characterStore.character) return;
    characterStore.setCharacter(result.character);
  }

  /** The player's claim of a finished challenge: pays it, once. A no-op for one not waiting to be claimed. */
  function claimChallenge(id: ChallengeId): void {
    const entry = claimableChallenges(characterStore.character).find((e) => e.id === id);
    if (!entry) return;
    characterStore.setCharacter(markChallengeClaimed(characterStore.character, id));
    payChallenge(entry);
  }

  /**
   * Shared reward core: resolves the combat outcome (boss damage or player
   * healing) exactly once via `completeHabit` (or `overdriveHabit` for an
   * Overdrive activation), writes the result back into all three stores,
   * grants any streak-milestone EXP, then checks for — and applies — a boss
   * defeat. Used for a good habit's checkbox tap, a bad habit's
   * rollover-detected avoidance, and an Overdrive activation.
   * `stampPeriodKey`, when given, also marks the habit completed for that
   * period — only correct for a live tap; a rollover resolution or an
   * Overdrive activation (already completed) leaves it untouched.
   *
   * Never checks for player death: this path never damages the player, so
   * it cannot kill them.
   */
  function applyReward(
    habitId: string,
    stampPeriodKey?: string,
    options: { isOverdriveUse?: boolean } = {},
  ): RewardResult {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    if (!habit) return { itemsDropped: [] };

    const healthBefore = characterStore.character.currentHealth;
    const bossBefore = bossStore.boss;
    const currentPeriodKey = periodKeyFor(habit.period, debugClockStore.now());
    // Always the daily key (never the habit's own period key) — Wounds
    // duration always runs in days, even for a weekly habit. See
    // healingMultiplier/activeWoundsEffect in game-engine/combat.ts.
    const currentDayKey = dailyPeriodKey(debugClockStore.now());
    const result = options.isOverdriveUse
      ? overdriveHabit(characterStore.character, habit, habitStore.habits, bossStore.boss, currentDayKey, currentPeriodKey, rng)
      : completeHabit(characterStore.character, habit, habitStore.habits, bossStore.boss, currentDayKey, rng);

    const updatedHabit: Habit = stampPeriodKey
      ? { ...result.updatedHabit, lastCompletedPeriodKey: stampPeriodKey, lastCheckedPeriodKey: stampPeriodKey }
      : result.updatedHabit;

    characterStore.setCharacter(result.character);
    bossStore.setBoss(result.boss);
    habitStore.updateHabit(updatedHabit);

    // A Rend/Ravage the blow knocked loose plays as its own hurt after it,
    // so the blow's own hero HP change (lifesteal, reflect) leaves it out.
    const bossSkill = result.bossSkill;
    const skillHit =
      bossSkill?.outcome === 'landed' && (bossSkill.skill === 'rend' || bossSkill.skill === 'ravage') ? (bossSkill.amount ?? 0) : 0;

    // The blow, sent to the stage; a kill's fall waits until it lands.
    const healthAfter = result.character.currentHealth + skillHit;
    const bossHpChange = result.boss.health - bossBefore.health;
    let landsInMs = 0;
    if (habit.damageType === 'healing') {
      landsInMs = playHit({ kind: 'heal', amount: healthAfter - healthBefore, hp: healthAfter - healthBefore });
      if (result.damageDealt) {
        landsInMs = playHit({
          kind: 'strike', by: 'hero', type: 'trueDamage', amount: result.damageDealt, crit: false, hp: bossHpChange, bossIndex: bossBefore.index,
        });
      }
    } else if (result.damageDealt !== undefined) {
      // Shown reflect first, then lifesteal, together making the one change the engine made.
      const reflectHp = result.reflectedDamage ? Math.max(0, healthBefore - result.reflectedDamage) - healthBefore : 0;
      landsInMs = playHit({
        kind: 'strike',
        by: 'hero',
        type: habit.damageType,
        amount: result.damageDealt,
        crit: result.wasCrit ?? false,
        hp: bossHpChange,
        bossIndex: bossBefore.index,
        ...(result.reflectedDamage ? { reflect: { amount: result.reflectedDamage, hp: reflectHp } } : {}),
        ...(result.lifestealHealed || result.critHealed
          ? { lifesteal: { amount: (result.lifestealHealed ?? 0) + (result.critHealed ?? 0), hp: healthAfter - healthBefore - reflectHp } }
          : {}),
      });
    }
    if (skillHit > 0) landsInMs = playHit({ kind: 'hurt', amount: skillHit, hp: -skillHit });
    if (bossSkill) showBossSkill(bossSkill, landsInMs);

    if (habit.damageType === 'healing') {
      // Censer of Wrath: the heal also hit the boss (as true damage).
      if (result.damageDealt) {
        activityLogStore.addEntry({ kind: 'skill-damage', habitName: habit.name, amount: result.damageDealt, isTrueDamage: true });
      }
      if (bossSkill) logBossSkill(bossSkill);
      activityLogStore.addEntry({
        kind: 'heal',
        habitName: habit.name,
        amount: healthAfter - healthBefore,
        milestoneExp: result.milestoneExp,
        ...(result.healCrit && { crit: true }),
      });
    } else if (result.damageDealt !== undefined) {
      // Boss skill pushed first so the "skill used" entry — the headline of
      // this action — lands on top (newest).
      if (bossSkill) logBossSkill(bossSkill);
      activityLogStore.addEntry({
        kind: 'skill-damage',
        habitName: habit.name,
        amount: result.damageDealt,
        isTrueDamage: habit.damageType === 'trueDamage',
        milestoneExp: result.milestoneExp,
        ...(result.wasCrit && { crit: true }),
        ...(result.lifestealHealed && { lifesteal: result.lifestealHealed }),
        ...(result.critHealed && { critHeal: result.critHealed }),
        ...(result.reflectedDamage && { reflected: result.reflectedDamage }),
      });
    }
    if ((result.updatedHabit.rank ?? 0) > (habit.rank ?? 0)) {
      activityLogStore.addEntry({ kind: 'rank-up', habitName: habit.name, rank: result.updatedHabit.rank ?? 0 });
    }

    // Challenges that watch this blow. A live tap of a good habit is the only
    // one that counts as a check (a rollover resolution or an Overdrive use
    // is not); the rest read what the engine rolled.
    const rankedUp = (result.updatedHabit.rank ?? 0) > (habit.rank ?? 0);
    if (result.wasCrit) reportChallenge({ type: 'crit-landed' });
    if (rankedUp) reportChallenge({ type: 'rank-up' });
    if (stampPeriodKey && !habit.isBad) reportChallenge({ type: 'habit-checked', habit, hour: debugClockStore.now().getHours() });

    // Overdrive uses pay no skill EXP (and no milestone, see completeHabit).
    const skillExp = options.isOverdriveUse
      ? 0
      : skillCompletionExp(characterStore.character.level, habit, habitStore.habits, debugClockStore.now());
    const expGained = result.milestoneExp + skillExp;
    if (expGained > 0) {
      const beforeLevelUp = characterStore.character;
      const { character, levelsGained } = addExpAndResolveLevelUps(beforeLevelUp, expGained);
      logLevelUpIfAny(beforeLevelUp, character);
      characterStore.setCharacter(character);
      grantEventPicks(levelsGained);
    }

    const beforeDefeat = characterStore.character;
    const slain = bossStore.boss;
    const defeatResult = resolveBossDefeatIfDead(characterStore.character, slain, rng);
    if (!defeatResult.defeated) {
      reportChallenge({ type: 'state-changed', habits: habitStore.habits });
      return { itemsDropped: [] };
    }

    activityLogStore.addEntry({ kind: 'boss-defeated', bossIndex: slain.index, amount: defeatResult.expReward });
    if (defeatResult.itemHealed) activityLogStore.addEntry({ kind: 'item-heal', itemName: 'Soul Lantern', amount: defeatResult.itemHealed });
    if (defeatResult.talentHealed) activityLogStore.addEntry({ kind: 'item-heal', itemName: 'Second Wind', amount: defeatResult.talentHealed });
    // Queued before the level-up beat below so the panels swap to the slain
    // boss in the same render the store swaps to the next one.
    celebrateBossKill(slain, defeatResult.boss, landsInMs);
    logLevelUpIfAny(beforeDefeat, defeatResult.character);
    characterStore.setCharacter(defeatResult.character);
    bossStore.setBoss(defeatResult.boss);
    grantEventPicks(defeatResult.levelsGained);

    reportChallenge({ type: 'boss-defeated', boss: slain, byTrueSkill: habit.damageType === 'trueDamage', byCrit: result.wasCrit ?? false });
    characterStore.setCharacter(milestoneTrial(characterStore.character, slain.index, rng, dailyPeriodKey(debugClockStore.now())));
    if (defeatResult.itemsDropped.some((item) => item.rarity === 'epic')) reportChallenge({ type: 'epic-dropped' });
    reportChallenge({ type: 'state-changed', habits: habitStore.habits });

    return { itemsDropped: defeatResult.itemsDropped, droppedBy: PERSONALITY_NAME[slain.personality] };
  }

  /**
   * Lands one boss attack on the player: writes the struck character and boss
   * back, plays the boss's strike (so the boss visibly hits the hero), logs
   * it, then checks for death. If the damage brought currentHealth to 0, an
   * equipped Phoenix Feather is consumed and the hero revives at once (no
   * death screen); otherwise the death screen is flagged and the actual
   * reset waits for `restart()`. Shared by a missed habit and a missed quest.
   *
   * Returns whether the hero fell (died, or the Feather revived them).
   */
  function landBossStrike(
    result: { character: Character; boss: Boss; wasCrit: boolean; attackType: 'physical' | 'magic'; bossLifestealHealed?: number; dodged?: true },
    healthBefore: number,
    bossBefore: Boss,
    name: string,
    logEntry: (hit: { amount: number; attackType: 'physical' | 'magic'; crit?: true; lifesteal?: number }) => Parameters<typeof activityLogStore.addEntry>[0],
  ): boolean {
    characterStore.setCharacter(result.character);
    bossStore.setBoss(result.boss);

    // Unbroken: nothing lands, so nothing plays on the stage; the log says so.
    if (result.dodged) {
      activityLogStore.addEntry({ kind: 'dodged', name });
      return false;
    }

    const dealt = healthBefore - result.character.currentHealth;
    playHit({
      kind: 'strike',
      by: 'boss',
      type: result.attackType,
      amount: dealt,
      crit: result.wasCrit,
      hp: -dealt,
      bossIndex: bossBefore.index,
      ...(result.bossLifestealHealed ? { lifesteal: { amount: result.bossLifestealHealed, hp: result.bossLifestealHealed } } : {}),
    });

    activityLogStore.addEntry(
      logEntry({
        amount: dealt,
        attackType: result.attackType,
        ...(result.wasCrit && { crit: true as const }),
        ...(result.bossLifestealHealed && { lifesteal: result.bossLifestealHealed }),
      }),
    );

    // Rounded, not the raw float: the health bar already displays
    // Math.round(currentHealth), so a tiny positive remainder (e.g. 0.3)
    // would otherwise show as "0 HP" without actually triggering death.
    if (Math.round(result.character.currentHealth) <= 0) {
      const reviveResult = reviveWithFeatherIfEquipped(result.character);
      if (reviveResult.revived) {
        characterStore.setCharacter(reviveResult.character);
        showReviveNotice();
      } else {
        triggerDeath();
      }
      return true;
    }
    return false;
  }

  /**
   * Shared penalty core: resolves boss-attack damage to the player exactly
   * once via `missHabit`, updates the habit store, and lands the strike (see
   * `landBossStrike`; a lifesteal boss heals off this same attack). Used for
   * both a good habit's rollover-detected miss and a bad habit's checkbox
   * tap. `stampPeriodKey` mirrors `applyReward`'s.
   *
   * Returns whether the hero fell (died, or the Feather revived them).
   */
  function applyPenalty(habitId: string, stampPeriodKey?: string): boolean {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    if (!habit) return false;

    const healthBefore = characterStore.character.currentHealth;
    const bossBefore = bossStore.boss;
    const currentDayKey = dailyPeriodKey(debugClockStore.now());
    const result = missHabit(characterStore.character, habit, bossBefore, currentDayKey, rng);

    const updatedHabit: Habit = stampPeriodKey
      ? { ...result.updatedHabit, lastCompletedPeriodKey: stampPeriodKey, lastCheckedPeriodKey: stampPeriodKey }
      : result.updatedHabit;

    habitStore.updateHabit(updatedHabit);
    return landBossStrike(result, healthBefore, bossBefore, habit.name, (hit) => ({ kind: 'hit', habitName: habit.name, ...hit }));
  }

  /**
   * Checks off a habit. For a good habit this resolves the reward
   * (`applyReward`); for a bad habit it resolves the penalty
   * (`applyPenalty` — you just admitted doing the bad thing). Either way,
   * stamps the habit completed for the current period.
   *
   * Engine-level idempotency guard: this is the authoritative check that a
   * habit cannot be resolved twice in the same period (double streak
   * change, double damage, double milestone EXP), independent of any
   * UI-layer `:disabled` binding. Mirrors the `isCompletedThisPeriod`
   * predicate used in `HabitListItem.vue`. A set-day habit can't be
   * checked off on a rest day either (`isDueOn`).
   *
   * A plain blow is offered to the menu's Undo (see useUndoCheck); a
   * level-up, a boss kill, or a fall sets off too much to wind back, so it
   * takes away any earlier offer instead.
   */
  function checkOffHabit(habitId: string): RewardResult {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    if (!habit) return { itemsDropped: [] };
    if (!isDueOn(habit, debugClockStore.now())) return { itemsDropped: [] };

    const currentPeriodKey = periodKeyFor(habit.period, debugClockStore.now());
    if (habit.lastCompletedPeriodKey === currentPeriodKey) return { itemsDropped: [] };

    const before = undoCheck.snapshot();
    let result: RewardResult = { itemsDropped: [] };
    let fell = false;
    if (habit.isBad) {
      fell = applyPenalty(habitId, currentPeriodKey);
      characterStore.setCharacter(recordBadCheck(characterStore.character, dailyPeriodKey(debugClockStore.now())));
    } else result = applyReward(habitId, currentPeriodKey);

    // A finished challenge isn't offered to Undo.
    const plain =
      !fell &&
      characterStore.character.level === before.character.level &&
      bossStore.boss.index === before.boss.index &&
      doneChallenges(characterStore.character).length === doneChallenges(before.character).length;
    if (plain) undoCheck.offer(before);
    else undoCheck.forget();
    return result;
  }

  /**
   * Resolves a good habit's rollover-detected miss (penalty) — called only
   * from `useMissedSkillsGate.acknowledge()` once the player has seen the
   * popup. Doesn't stamp `lastCompletedPeriodKey`: a rollover resolution
   * was never an active tap, so completion status for the period stays
   * untouched (`lastCheckedPeriodKey` is stamped separately by the gate).
   */
  function checkMissedHabit(habitId: string): void {
    applyPenalty(habitId);
  }

  /**
   * Resolves a bad habit's rollover-detected avoidance (reward) — the bad-
   * habit counterpart to `checkMissedHabit`, called the same way from
   * `useMissedSkillsGate.acknowledge()`.
   */
  function checkAvoidedHabit(habitId: string): RewardResult {
    const result = applyReward(habitId);
    if (habitStore.habits.find((h) => h.id === habitId)?.isBad) reportChallenge({ type: 'bad-resisted' });
    return result;
  }

  /**
   * Activates one of a habit's Overdrive extra uses (see `Habit.isOverdrive`)
   * at reduced damage. Good-habit-only, gated on the habit already being
   * checked off this period and having uses remaining — the authoritative
   * guard, independent of the UI button's `:disabled` binding, mirroring
   * `checkOffHabit`'s own period-key guard above. Refused on a rest day even
   * if the habit was checked off before today was taken out of its days.
   */
  function activateOverdrive(habitId: string): RewardResult {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    if (!habit || habit.isBad || !habit.isOverdrive) return { itemsDropped: [] };
    if (!isDueOn(habit, debugClockStore.now())) return { itemsDropped: [] };

    const currentPeriodKey = periodKeyFor(habit.period, debugClockStore.now());
    if (habit.lastCompletedPeriodKey !== currentPeriodKey) return { itemsDropped: [] };
    if (overdriveUsesRemaining(habit, currentPeriodKey) <= 0) return { itemsDropped: [] };

    return applyReward(habitId, undefined, { isOverdriveUse: true });
  }

  /**
   * Thin wrapper around `habitStore.addHabit`, sharing this module's Rng.
   */
  function addHabit(name: string, period: Period, difficulty: Difficulty, isBad: boolean, days?: number[]): Habit {
    const created = habitStore.addHabit(name, period, difficulty, isBad, rng, days, heroClassFor(characterStore.character));
    // Stamped so the next rollover doesn't count the period before this
    // habit existed as a miss, and with its day so it can't be removed until
    // tomorrow (see removalLocked).
    const now = debugClockStore.now();
    const habit = { ...created, lastCheckedPeriodKey: periodKeyFor(period, now), createdDayKey: dailyPeriodKey(now) };
    habitStore.updateHabit(habit);
    reportChallenge({ type: 'habit-added', habit });
    return habit;
  }

  /** Adds a quest stamped with today's day, so Fresh quests and Quest run can tell when it was made. */
  function addQuest(description: string, difficulty: Difficulty, dueDateKey: string): Quest {
    const quest = questStore.addQuest(description, difficulty, dueDateKey, dailyPeriodKey(debugClockStore.now()));
    reportChallenge({ type: 'quest-added', questId: quest.id });
    return quest;
  }

  /**
   * Performs the actual death reset (fresh character, boss back to index 1,
   * habits kept with re-rolled damage types) and closes the death screen.
   * Called once, from the "Restart" button — no-op if somehow not dead.
   *
   * Snapshots the just-ended run into the high-score leaderboard first,
   * reading the character/boss/habits BEFORE `resolvePlayerDeathIfDead`
   * overwrites them — this is the only place that run's peak state is still
   * available.
   */
  function restart(): void {
    const character = characterStore.character;
    const bossIndexAtDeath = bossStore.boss.index;
    const habits = habitStore.habits;

    const deathResult = resolvePlayerDeathIfDead(character, bossStore.boss, habits, rng);
    if (deathResult.died) {
      highScoreStore.recordRunEnd({
        bossIndex: bossIndexAtDeath,
        level: character.level,
        endedDayKey: dailyPeriodKey(debugClockStore.now()),
        stats: {
          physicalDamage: effectiveStat(character, 'physicalDamage'),
          magicDamage: effectiveStat(character, 'magicDamage'),
          healing: effectiveStat(character, 'healing'),
          health: effectiveStat(character, 'health'),
          trueDamage: effectiveStat(character, 'trueDamage'),
          critChance: effectiveCritChance(character),
        },
        habits: habits.map((h) => ({
          name: h.name,
          period: h.period,
          damageType: h.damageType,
          isBad: h.isBad,
          streakCount: h.streakCount,
          rank: h.rank ?? 0,
        })),
        items: character.ownedItemIds.flatMap((id) => {
          const item = ITEM_CATALOG.find((i) => i.id === id);
          if (!item) return [];
          const factor = itemDoubleFactor(character, id);
          return [
            {
              id: item.id,
              name: item.name,
              icon: item.icon,
              equipped: character.equippedItemIds.includes(id),
              stats: describeItemBonus(item, factor),
              enchanted: factor > 1,
            },
          ];
        }),
        heroName: character.name ?? DEFAULT_HERO_NAME,
        heroClass: heroClassFor(character),
        bossPersonality: bossStore.boss.personality,
        bossArt: bossArt(bossStore.boss),
      });

      // The fresh character is unnamed, so the new-hero screen shows next and
      // reads this to say who fell where.
      recordFallen({ name: character.name ?? DEFAULT_HERO_NAME, bossIndex: bossIndexAtDeath });
      // Quests survive a death; if any carried over, the new run starts with
      // them open (and never shows the level-2 "Quests unlocked" popup).
      characterStore.setCharacter(questStore.quests.length > 0 ? unlockQuests(deathResult.character) : deathResult.character);
      bossStore.setBoss(deathResult.boss);
      habitStore.setHabits(deathResult.habits);
      // Drops and beats from a boss kill on the fatal pass belong to the dead run.
      clearItemDrops();
      clearCelebration();
      clearBossSkills();
    }
    dismissDeathScreen();
  }

  /**
   * Starts the run from the new-hero screen: a new run gets the picked hero
   * (Fate rolls one; see chooseHero), then the hero is named, which closes
   * that screen. The hooded figure then speaks: his opening to the very first
   * hero, a return line to any after a death (a past run on the board says so,
   * which a reload can't lose).
   */
  function beginRun(name: string, pick: HeroPick): void {
    const heroClass = pick === 'fate' ? pickRandom(HERO_CLASSES, rng) : pick;
    const chosen = chooseHero(characterStore.character, habitStore.habits, heroClass, rng);
    characterStore.setCharacter(chosen.character);
    habitStore.setHabits(chosen.habits);
    characterStore.setName(name);
    clearFallen();
    startScene(highScoreStore.topRuns.length > 0 ? 'back' : 'intro');
  }

  /**
   * Completes a quest — used both for an on-time checkbox tap (QuestSection)
   * and an "I actually did this" override from the missed-deadline gate (see
   * useQuestMissGate); the two cases resolve identically. A quest already
   * checked off is left alone (null).
   *
   * Regular: grants the weekly-curve EXP for the next slot (questRewardExp, at
   * the level held right now), bumps this calendar week's completion count,
   * and resolves any level-ups. An overdue quest (its miss already landed)
   * pays half the next slot's EXP instead and takes no slot.
   * Either way it logs a quest-completed entry and keeps the quest, checked
   * off for today (the rollover removes it). Returns what was paid out (null
   * for an unknown or already checked id) so the caller can celebrate it.
   */
  function completeQuest(questId: string): { amount: number } | null {
    const quest = questStore.quests.find((q) => q.id === questId);
    if (!quest || quest.doneDayKey) return null;
    const dayKey = dailyPeriodKey(debugClockStore.now());

    const weekKey = weeklyPeriodKey(debugClockStore.now());
    const beforeLevelUp = characterStore.character;
    const week = questWeekFor(beforeLevelUp.questWeek, weekKey);
    const amount = quest.overdue
      ? questOverdueExp(beforeLevelUp, quest.difficulty, week.completed)
      : questRewardExp(beforeLevelUp, quest.difficulty, week.completed);
    const { character, levelsGained } = addExpAndResolveLevelUps(beforeLevelUp, amount);
    logLevelUpIfAny(beforeLevelUp, character);
    characterStore.setCharacter(quest.overdue ? character : { ...character, questWeek: recordQuestCompletion(beforeLevelUp.questWeek, weekKey) });
    grantEventPicks(levelsGained);

    activityLogStore.addEntry({ kind: 'quest-completed', description: quest.description, amount });
    questStore.markDone(questId, dayKey);
    if (!quest.overdue) reportChallenge({ type: 'quest-completed', createdDayKey: quest.createdDayKey });
    return { amount };
  }

  /**
   * Resolves a quest's missed due date (not overridden): the boss hits the
   * character exactly as for a missed daily of the same difficulty
   * (`missQuest` + `landBossStrike`: armor, crit, lifesteal, the strike
   * animation, the death check and Phoenix Feather revive), logs a
   * quest-failed entry, and flags the quest overdue — it stays in the list,
   * still finishable for half EXP. Called only from
   * useQuestMissGate.acknowledge() for a quest the player didn't flag as
   * "I actually did this".
   */
  function failQuest(questId: string): void {
    const quest = questStore.quests.find((q) => q.id === questId);
    if (!quest) return;

    const healthBefore = characterStore.character.currentHealth;
    const bossBefore = bossStore.boss;
    const currentDayKey = dailyPeriodKey(debugClockStore.now());
    const result = missQuest(characterStore.character, quest, bossBefore, currentDayKey, rng);

    questStore.markOverdue(questId);
    landBossStrike(result, healthBefore, bossBefore, quest.description, (hit) => ({ kind: 'quest-failed', description: quest.description, ...hit }));
  }

  /**
   * Lands the current boss's Doom if its day has come (see `resolveDoom`).
   * Called from the daily rollover, and from the missed-skills popup's OK
   * once the day's misses have resolved. Doom never kills, so there's no
   * death check.
   */
  function landDoom(currentDayKey: string = dailyPeriodKey(debugClockStore.now())): void {
    const result = resolveDoom(characterStore.character, bossStore.boss, currentDayKey);
    if (result.amount === undefined) return;
    characterStore.setCharacter(result.character);
    bossStore.setBoss(result.boss);
    playHit({ kind: 'hurt', amount: result.amount, hp: -result.amount });
    activityLogStore.addEntry({ kind: 'doom-landed', amount: result.amount });
  }

  return {
    checkOffHabit,
    checkMissedHabit,
    checkAvoidedHabit,
    activateOverdrive,
    landDoom,
    addHabit,
    addQuest,
    reportChallenge,
    claimChallenge,
    restart,
    beginRun,
    completeQuest,
    failQuest,
  };
}
