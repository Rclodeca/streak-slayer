// One sim run on the real engine: a hero, their habits and a boss, played day
// by day. The day's turnover follows the app (useDailyRollover,
// useMissedSkillsGate.acknowledge, useCombatActions): rewards for bad habits
// held, then misses, then Doom and Ember Heart, then the death check. The
// player's choices live in brain.ts.
//
// Imported only after the worker has applied any tuning overrides, since some
// engine constants are copied when their modules load.

import { bossAttackAnchorHealth, bossNumber, generateBoss } from '../../src/game-engine/boss';
import { resolveDoom } from '../../src/game-engine/bossSkills';
import { createCharacter } from '../../src/game-engine/character';
import type { HeroClass } from '../../src/game-engine/character';
import { completeHabit, missHabit, resolveBossDefeatIfDead, resolvePlayerDeathIfDead } from '../../src/game-engine/combat';
import { UNLOCK_LEVELS } from '../../src/game-engine/constants/unlocks';
import { purseGold } from '../../src/game-engine/constants/economy';
import { createHabit, healingAllowed, healingRequired } from '../../src/game-engine/habits';
import { applyDailyRegen } from '../../src/game-engine/itemEffects';
import { rollItemDrops } from '../../src/game-engine/items';
import { grantLevelRewards } from '../../src/game-engine/levelRewards';
import { activeExpBoost, addExpAndResolveLevelUps, applyExpBoost, skillCompletionExp } from '../../src/game-engine/leveling';
import { TUNING } from '../../src/game-engine/constants/tuning';
import { PRESTIGE_RANKS, canPrestige } from '../../src/game-engine/prestige';
import { prestigeRun } from '../../src/game-engine/prestigeRun';
import { questRewardExp, questWeekFor, recordQuestCompletion } from '../../src/game-engine/quests';
import { createRng } from '../../src/game-engine/rng';
import type { Rng } from '../../src/game-engine/rng';
import { unlockTalents } from '../../src/game-engine/talents';
import { dailyPeriodKey, weeklyPeriodKey } from '../../src/game-engine/time';
import type { Boss, Character, Difficulty, Habit } from '../../src/game-engine/types';
import { buyTalents, chooseGear, gearRarities, maybeDrinkPotion, wearAtRandom } from './brain';
import { doneChance, missRate } from './players';
import type { PlayerKind } from './players';

export interface RunOptions {
  player: PlayerKind;
  habits: number;
  badHabits: number;
  tasksPerWeek: number;
  days: number;
  heroClass: HeroClass;
  seed: number;
  talentShare: number;
  slotBosses: number[];
  /** Days to snapshot the level, gear and talents on. */
  snapshotDays: number[];
  /** A hypothetical EXP rush: EXP items first, and Double EXP kept running (gems unlimited). */
  expRush?: boolean;
  /** A no-RPG player: wears each drop (into a free slot, or over a random one), buys nothing, no talents, potions or slots. */
  noRpg?: boolean;
  /** Prestige as soon as each rank opens, through rank V (prestigeRun keeps talents, habit ranks and unlocks). */
  prestige?: boolean;
}

export interface RunResult {
  /** The first day (1 = the first day) each level was reached. */
  levelDay: Record<number, number>;
  unlockDay: Record<string, number>;
  prestigeDay?: number;
  deathDays: number[];
  killDays: number[];
  levelOn: Record<number, number>;
  bossOn: Record<number, number>;
  talentsOn: Record<number, number>;
  gearOn: Record<number, Record<string, number>>;
  /** The hero's level when each boss power index first spawned (what EXPECTED_LEVEL_BY_BOSS_INDEX models). */
  levelAtBoss: Record<number, number>;
  /** With `prestige`: the day each rank was taken, and the talents and kills each run had by then. */
  prestigeDays: number[];
  runTalents: number[];
  runKills: number[];
  /** With `prestige`, per finished run: gold earned (kills and the daily purse), gold spent on talents, and the mean gold of the bosses killed. */
  runGold: number[];
  runTalentGold: number[];
  runKillGold: number[];
  runPotions: number[];
  killsByPrestige?: number;
  talentsByPrestige?: number;
  potions: number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'medium', 'hard'];
const START = new Date(2026, 0, 5, 12); // a Monday at noon, so weeks line up with day 0

function dateFor(day: number): Date {
  return new Date(START.getFullYear(), START.getMonth(), START.getDate() + day, 12);
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function runOnce(opts: RunOptions): RunResult {
  const rng = createRng(opts.seed);
  let character: Character = { ...createCharacter(rng, opts.heroClass), heroPending: false, name: 'Sim' };
  const startKey = dailyPeriodKey(dateFor(0));

  // The habit list, made as the app makes it (healing capped, one required).
  let habits: Habit[] = [];
  const add = (isBad: boolean, i: number) => {
    const excludeHealing = !healingAllowed(habits, habits.length + 1);
    const difficulty = DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)];
    const habit = createHabit(`${isBad ? 'Bad' : 'Habit'} ${i + 1}`, 'daily', difficulty, isBad, rng, undefined, habits.length === 0, excludeHealing, opts.heroClass, isBad ? false : healingRequired(habits));
    habits.push({ ...habit, lastCheckedPeriodKey: startKey, createdDayKey: startKey });
  };
  for (let i = 0; i < opts.habits; i++) add(false, i);
  for (let i = 0; i < opts.badHabits; i++) add(true, i);
  const goodIds = habits.filter((h) => !h.isBad).map((h) => h.id);

  let boss: Boss = generateBoss(1, rng, undefined, bossAttackAnchorHealth(1, character.starterStats.health, character.level));

  const result: RunResult = { levelDay: { 1: 1 }, levelAtBoss: { 1: character.level }, unlockDay: {}, prestigeDays: [], runTalents: [], runKills: [], runGold: [], runTalentGold: [], runKillGold: [], runPotions: [], deathDays: [], killDays: [], levelOn: {}, bossOn: {}, talentsOn: {}, gearOn: {}, potions: 0 };
  const unlocks = Object.entries(UNLOCK_LEVELS) as [string, number][];
  const prestigeBar = PRESTIGE_RANKS[0].bar;
  let goldEarned = 0;
  let goldOnTalents = 0;
  let talentsBought = 0;
  let potionWindow = -1;
  let day = 0;
  let dayKey = startKey;
  let fell = false;
  let rank = 0;
  let runKillsStart = 0;
  let runPurse = 0;
  let runPotionsStart = 0;
  let runKillGold = 0;

  const handOutLevelRewards = () => {
    const granted = grantLevelRewards(habits, character.level, rng);
    if (granted.habits !== habits) habits = granted.habits;
  };
  const noteLevel = () => {
    for (let l = 2; l <= character.level; l++) if (!(l in result.levelDay)) result.levelDay[l] = day + 1;
    for (const [id, level] of unlocks) if (!(id in result.unlockDay) && character.level >= level) result.unlockDay[id] = day + 1;
    if (result.prestigeDay === undefined && character.level >= prestigeBar) {
      result.prestigeDay = day + 1;
      result.killsByPrestige = result.killDays.length;
      result.talentsByPrestige = talentsBought;
    }
    if (character.level >= UNLOCK_LEVELS.talents) character = unlockTalents(character);
  };
  const addExp = (amount: number) => {
    if (amount <= 0) return;
    character = addExpAndResolveLevelUps(character, amount, dayKey).character;
    handOutLevelRewards();
    noteLevel();
  };
  const isDead = () => Math.round(character.currentHealth) <= 0;
  const afterHit = () => {
    if (isDead()) fell = true;
    else if (!opts.noRpg) {
      const drink = maybeDrinkPotion(character, day, potionWindow);
      if (drink.window !== potionWindow) result.potions++;
      character = drink.character;
      potionWindow = drink.window;
    }
  };

  /** A habit's blow (or a held bad habit's reward), with its EXP, any kill, the drops and the talents a kill pays for. */
  const strike = (habitId: string, stampKey?: string) => {
    const habit = habits.find((h) => h.id === habitId)!;
    const blow = completeHabit(character, habit, habits, boss, dayKey, rng);
    character = blow.character;
    boss = blow.boss;
    const updated = stampKey ? { ...blow.updatedHabit, lastCompletedPeriodKey: stampKey, lastCheckedPeriodKey: stampKey } : blow.updatedHabit;
    habits = habits.map((h) => (h.id === habitId ? updated : h));
    addExp(blow.milestoneExp + skillCompletionExp(character.level, habit, habits, dateFor(day)));
    const defeat = resolveBossDefeatIfDead(character, boss, rng, dayKey);
    if (defeat.defeated) {
      character = defeat.character;
      boss = defeat.boss;
      result.killDays.push(day + 1);
      if (!(boss.index in result.levelAtBoss)) result.levelAtBoss[boss.index] = character.level;
      handOutLevelRewards();
      noteLevel();
      if (opts.noRpg) {
        character = wearAtRandom(character, defeat.itemsDropped.map((item) => item.id), rng);
      } else {
        // The shop, as one more item to choose from (see the design doc).
        const shopItem = rollItemDrops(character, rng, 1);
        character = { ...character, ownedItemIds: [...character.ownedItemIds, ...shopItem.map((item) => item.id)] };
        const slotsDue = opts.slotBosses.filter((b) => bossNumber(boss) >= b).length;
        if (slotsDue > (character.slotUpgrades ?? 0)) character = { ...character, slotUpgrades: slotsDue };
        character = chooseGear(character, habits, opts.expRush);
      }
      goldEarned += defeat.goldReward;
      runKillGold += defeat.goldReward;
      const talents = buyTalents(character, boss.index, goldEarned * opts.talentShare - goldOnTalents, rng);
      character = talents.character;
      goldOnTalents += talents.spent;
      talentsBought += talents.bought;
    }
    afterHit();
  };

  /** A boss hit for a missed habit, or a bad habit given in. */
  const penalty = (habitId: string, stampKey?: string) => {
    const habit = habits.find((h) => h.id === habitId)!;
    const hit = missHabit(character, habit, boss, dayKey, rng);
    character = hit.character;
    boss = hit.boss;
    const updated = stampKey ? { ...hit.updatedHabit, lastCompletedPeriodKey: stampKey, lastCheckedPeriodKey: stampKey } : hit.updatedHabit;
    habits = habits.map((h) => (h.id === habitId ? updated : h));
    afterHit();
  };

  const rise = () => {
    if (!fell) return;
    const death = resolvePlayerDeathIfDead(character, boss, rng);
    if (death.died) {
      character = opts.noRpg ? death.character : chooseGear(death.character, habits, opts.expRush);
      boss = death.boss;
      result.deathDays.push(day + 1);
    }
    fell = false;
  };

  /** Takes the next rank when it's open: a fresh run with the talents, habit ranks and unlocks kept. */
  const maybePrestige = () => {
    if (!opts.prestige || !canPrestige(character, rank)) return;
    const next = prestigeRun(character, boss, habits, rank, rng);
    if (!next) return;
    result.prestigeDays.push(day + 1);
    result.runTalents.push(Object.values(character.talents ?? {}).reduce((a, b) => a + b, 0));
    result.runKills.push(result.killDays.length - runKillsStart);
    result.runGold.push(goldEarned + runPurse);
    result.runTalentGold.push(goldOnTalents);
    result.runKillGold.push(runKillGold / Math.max(1, result.killDays.length - runKillsStart));
    result.runPotions.push(result.potions - runPotionsStart);
    runPotionsStart = result.potions;
    runPurse = 0;
    runKillGold = 0;
    runKillsStart = result.killDays.length;
    // The same hero picked again on the new-hero screen (chooseHero keeps everything for the same class).
    character = { ...next.character, heroPending: false, name: 'Sim' };
    boss = next.boss;
    habits = next.habits;
    rank++;
    goldEarned = 0;
    goldOnTalents = 0;
  };

  const snapshot = () => {
    const d = day + 1;
    if (!opts.snapshotDays.includes(d)) return;
    result.levelOn[d] = character.level;
    result.bossOn[d] = bossNumber(boss);
    result.talentsOn[d] = talentsBought;
    result.gearOn[d] = gearRarities(character);
  };

  const badGiveIn = missRate(opts.player);
  const taskDays = [0, 2, 4, 1, 3, 5, 6].slice(0, Math.max(0, Math.min(7, opts.tasksPerWeek)));

  for (day = 0; day < opts.days; day++) {
    const date = dateFor(day);
    dayKey = dailyPeriodKey(date);

    // The turnover for yesterday: held bad habits pay first, then the misses land.
    if (day > 0) {
      const yesterday = dailyPeriodKey(dateFor(day - 1));
      const due = habits.filter((h) => h.lastCheckedPeriodKey !== dayKey);
      for (const h of due.filter((h) => h.isBad && h.lastCompletedPeriodKey !== yesterday)) strike(h.id);
      for (const h of due.filter((h) => !h.isBad && h.lastCompletedPeriodKey !== yesterday)) penalty(h.id);
      habits = habits.map((h) => (h.lastCheckedPeriodKey !== dayKey ? { ...h, lastCheckedPeriodKey: dayKey } : h));
      const doom = resolveDoom(character, boss, dayKey);
      character = doom.character;
      boss = doom.boss;
      character = applyDailyRegen(character, dayKey).character;
      afterHit();
      rise();
      maybePrestige();
    }

    runPurse += purseGold(boss.index);
    if (opts.expRush && !activeExpBoost(character, dayKey)) character = applyExpBoost(character, dayKey, TUNING.DOUBLE_EXP_BONUS, TUNING.DOUBLE_EXP_DAYS);

    // The day: each habit done or not, bad habits given in at the miss rate, the day's task.
    const actions: (() => void)[] = [];
    goodIds.forEach((id, j) => {
      if (rng() < doneChance(opts.player, j, goodIds.length)) actions.push(() => strike(id, dayKey));
    });
    for (const h of habits.filter((h) => h.isBad)) if (rng() < badGiveIn) actions.push(() => penalty(h.id, dayKey));
    if (taskDays.includes(day % 7)) {
      actions.push(() => {
        const weekKey = weeklyPeriodKey(date);
        const week = questWeekFor(character.questWeek, weekKey);
        const amount = questRewardExp(character, 'medium', week.completed);
        character = { ...character, questWeek: recordQuestCompletion(character.questWeek, weekKey) };
        addExp(amount);
      });
    }
    for (const act of shuffle(actions, rng)) {
      act();
      rise();
      maybePrestige();
    }
    snapshot();
  }
  return result;
}
