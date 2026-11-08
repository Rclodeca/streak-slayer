import { TUNING } from './constants/tuning';
import { DIFFICULTY_WEIGHT } from './constants/difficulty';
import { hasItemEffect } from './items';
import { expToNextLevel } from './leveling';
import type { Rng } from './rng';
import type { Boss, Character, Difficulty, Quest, QuestWeek } from './types';

/** The player level at which the quests section opens, each run. */
export const QUESTS_UNLOCK_LEVEL = 2;

/** Whether the quests section is open: unlocked this run, or at the unlock level with its popup up. */
export function questsOpen(character: Character): boolean {
  return character.questsUnlocked === true || character.level >= QUESTS_UNLOCK_LEVEL;
}

/** Whether the "Quests unlocked" popup is due: the unlock level reached this run, with nothing carried over to open quests sooner. */
export function questUnlockPending(character: Character): boolean {
  return !character.questsUnlocked && character.level >= QUESTS_UNLOCK_LEVEL;
}

/** Opens the quests section for the rest of the run. */
export function unlockQuests(character: Character): Character {
  return character.questsUnlocked ? character : { ...character, questsUnlocked: true };
}

/**
 * Settles `questsUnlocked` on a save from before the quest lock: a hero
 * already at the unlock level, or holding quests, was already using them, so they
 * stay open with no popup. Anyone else is sealed like any new run.
 */
export function migrateQuestUnlock(character: Character, hasQuests: boolean): Character {
  if (character.questsUnlocked !== undefined) return character;
  return { ...character, questsUnlocked: character.level >= QUESTS_UNLOCK_LEVEL || hasQuests };
}

export interface QuestCurveOptions {
  /** How many quests per week count as the baseline (TUNING.QUESTS_PER_WEEK_ON_CURVE). */
  onCurve?: number;
  /** Percent of the weekly target paid by each successive weekly completion (TUNING.QUEST_SLOT_WEIGHTS). */
  weights?: readonly number[];
  /** Fraction of expToNextLevel the weekly target is worth (TUNING.QUEST_TARGET_LEVEL_FRACTION). */
  fraction?: number;
}

/** Sum of the first `n` slot weights; fractional `n` interpolates linearly into the next slot. */
export function cumulativeSlotWeight(n: number, weights: readonly number[] = TUNING.QUEST_SLOT_WEIGHTS): number {
  let total = 0;
  for (let i = 0; i < weights.length && i < n; i++) {
    total += weights[i] * Math.min(1, n - i);
  }
  return total;
}

/** EXP a medium slot-1 quest pays at `level` — the weekly target the slot curve is a percentage of. */
export function questWeeklyTargetExp(level: number, fraction: number = TUNING.QUEST_TARGET_LEVEL_FRACTION): number {
  return Math.max(TUNING.QUEST_MIN_TARGET_EXP, expToNextLevel(level) * fraction);
}

/**
 * EXP for completing a regular quest: the weekly target at `level`, times the
 * slot's weight, rescaled so the first `onCurve` slots sum to exactly the
 * target, times the difficulty multiplier. `completedThisWeek` is how many
 * regular quests were already completed this calendar week (0 = slot 1);
 * slots past the last weight pay 0.
 */
export function questSlotExp(
  level: number,
  difficulty: Difficulty,
  completedThisWeek: number,
  options: QuestCurveOptions = {},
): number {
  const { onCurve = TUNING.QUESTS_PER_WEEK_ON_CURVE, weights = TUNING.QUEST_SLOT_WEIGHTS, fraction } = options;
  const weight = weights[completedThisWeek] ?? 0;
  if (weight === 0) return 0;
  const scale = 100 / cumulativeSlotWeight(onCurve, weights);
  return questWeeklyTargetExp(level, fraction) * (weight / 100) * scale * TUNING.QUEST_DIFFICULTY_MULT[difficulty];
}

/** questSlotExp at the character's level, ×QUILL_EXP_MULTIPLIER with Quill of Oaths equipped. */
export function questRewardExp(character: Character, difficulty: Difficulty, completedThisWeek: number): number {
  const exp = questSlotExp(character.level, difficulty, completedThisWeek);
  return hasItemEffect(character, 'quill-of-oaths') ? exp * TUNING.ITEM_EFFECTS.QUILL_EXP_MULTIPLIER : exp;
}

/** EXP for finishing an overdue quest: the next slot's pay at `QUEST_OVERDUE_EXP_FRACTION`. */
export function questOverdueExp(character: Character, difficulty: Difficulty, completedThisWeek: number): number {
  return questRewardExp(character, difficulty, completedThisWeek) * TUNING.QUEST_OVERDUE_EXP_FRACTION;
}

/** The week counter as of `weekKey`: a stale (or missing) counter starts over at 0. */
export function questWeekFor(questWeek: QuestWeek | undefined, weekKey: string): QuestWeek {
  return questWeek && questWeek.weekKey === weekKey ? questWeek : { weekKey, completed: 0 };
}

/** The counter after one more on-time regular-quest completion in `weekKey`'s week. */
export function recordQuestCompletion(questWeek: QuestWeek | undefined, weekKey: string): QuestWeek {
  const current = questWeekFor(questWeek, weekKey);
  return { weekKey, completed: current.completed + 1 };
}

/** Builds a new Quest record with a generated id; `createdDayKey` is the day it was added. */
export function createQuest(description: string, difficulty: Difficulty, dueDateKey: string, createdDayKey?: string): Quest {
  if (!dueDateKey) throw new Error('A quest needs a due date');
  const quest: Quest = { id: crypto.randomUUID(), description, difficulty, dueDateKey };
  if (createdDayKey !== undefined) quest.createdDayKey = createdDayKey;
  return quest;
}

/** A quest as saved by an older version, which may carry fields since removed. */
type SavedQuest = Quest & { kind?: string; rewardItemId?: string; bossIndexAtOffer?: number };

/**
 * Brings a saved quest up to the current shape: drops the removed `kind`
 * (an old side quest becomes a regular quest, its relic back in the pool),
 * `rewardItemId` and `bossIndexAtOffer`. Everything else, overdue and done
 * state included, is kept. Idempotent.
 */
export function migrateQuest(quest: SavedQuest): Quest {
  const migrated: SavedQuest = { ...quest };
  delete migrated.kind;
  delete migrated.rewardItemId;
  delete migrated.bossIndexAtOffer;
  return migrated;
}
