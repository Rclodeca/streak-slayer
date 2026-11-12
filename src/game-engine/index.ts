// Public API of the game engine. Consumers (Pinia stores, composables, UI)
// should import everything from this barrel rather than reaching into
// individual game-engine modules directly.

export type {
  Boss,
  BossSkillId,
  BossStat,
  BossSkillSlot,
  Breakpoint,
  Character,
  DamageType,
  Difficulty,
  Habit,
  Period,
  HybridPersonality,
  Personality,
  Quest,
  QuestWeek,
  StatusEffect,
  CritBoostStatusEffect,
  HealBoostStatusEffect,
  WoundsStatusEffect,
  BlindStatusEffect,
  SeverStatusEffect,
  SunderStatusEffect,
} from './types';

export {
  applyBossAttackEase,
  applyDamagePoolRebalance,
  applyHealBaseCut,
  applyHealBoost,
  applyHealingRebalance,
  applyHealthGrowthBump,
  applyRankRebalance,
  createCharacter,
  DEFAULT_HERO_NAME,
  discardUnequippedItems,
  discardUnknownItems,
  HERO_CLASSES,
  heroClassFor,
  MAX_HERO_NAME_LENGTH,
  migrateCharacter,
  nameCharacter,
  randomizeStat,
} from './character';
export type { HeroClass } from './character';

export {
  addExpAndResolveLevelUps,
  clampHealthToMax,
  activeCritBoost,
  activeHealBoost,
  critChanceBeforeBlind,
  effectiveCritChance,
  effectiveStat,
  expToNextLevel,
  itemStatMultiplier,
  skillCompletionExp,
  statAtLevel,
} from './leveling';

export {
  createHabit,
  crowdingFactor,
  difficultyFactor,
  healingAllowed,
  healingRequired,
  isDueOn,
  migrateHabitDamageType,
  nextDueDay,
  normalizeDays,
  removalLocked,
  rerollAllDamageTypes,
  rerollDamageType,
  resetLevelRewards,
  skillBaseDamage,
} from './habits';

export {
  completeHabitStreak,
  migrateHabitRank,
  nextRankMilestone,
  rankBonus,
  rankForStreak,
  rankMultiplier,
  resetHabitStreak,
  streakBonus,
} from './streaks';

export type { BossFamily } from './boss';
export {
  applyResist,
  bossAttackAnchorHealth,
  bossExpReward,
  BOSS_ART_COUNT,
  bossArt,
  bossBaseHealth,
  bossFamily,
  bossHealthGrowthRate,
  damageReductionPct,
  easeBossAttack,
  expectedLevelForBossIndex,
  generateBoss,
  PERSONALITY_NAME,
  rescaleBossToHealthBands,
  resistPctForIndex,
  rollRunDifficultyModifier,
} from './boss';

export { assignSpecialIfEligible, assignUltIfEligible, grantOverdrive } from './levelRewards';
export {
  applyCritBoostEvent,
  applyDoubleItemEvent,
  applyHealBoostEvent,
  applyHealEvent,
  applyOverdriveEvent,
  applyRerollSkillEvent,
  applySpecialEvent,
  applyUltEvent,
  consumeEventPick,
  eligibleEvents,
  EVENT_DEFS,
  EVENTS_PER_CHOICE,
  getEventDef,
  migrateEventState,
  recordSideQuestOffer,
  rollEventChoices,
} from './events';
export type { EventDef, EventId } from './events';

export type { CombatResult, HabitDamageBreakdown } from './combat';
export {
  activeWoundsEffect,
  bossMissDamage,
  chooseHero,
  completeHabit,
  DAMAGE_TYPE_STARTER_STAT,
  effectiveResistAfterPen,
  expectedMediumDailyDamage,
  habitDamageBreakdown,
  healingMultiplier,
  levelRewardMultiplier,
  missHabit,
  missQuest,
  overdriveDamagePreview,
  overdriveHabit,
  overdriveUsesRemaining,
  reviveWithFeatherIfEquipped,
  resolveBossDefeatIfDead,
  resolvePlayerDeathIfDead,
  weeklyBonusMultiplier,
} from './combat';

export {
  applyDailyRegen,
  bumpCritStreak,
  bumpSpellweave,
  critMultiplierFor,
  effectDamageMultiplier,
  hasItemEffect,
  isForcedCrit,
  spellweaveStacks,
} from './itemEffects';

export type { ChallengeDef, ChallengeEntry, ChallengeEvent, ChallengeId, ChallengeProgress, PendingAddition } from './challenges';
export {
  activeChallenges,
  applyChallengeEvent,
  challengeProgress,
  CHALLENGE_DEFS,
  claimableChallenges,
  doneChallenges,
  drawChallenge,
  getChallengeDef,
  markChallengeClaimed,
  migrateTrialUnlock,
  milestoneTrial,
  offerableChallenges,
  recordBadCheck,
  takeChallenge,
  trialsOpen,
  TRIALS_UNLOCK_LEVEL,
  trialUnlockPending,
  unlockTrials,
} from './challenges';

export type { TalentDef, TalentEffectId, TalentId, TalentShoot } from './talents';
export {
  bossKillHealPct,
  canSpendTalent,
  dodgeChancePct,
  healsCanCrit,
  isTalentUnlocked,
  lastStandFactor,
  levelUpHealBonusPct,
  milestoneExpMultiplier,
  questExpMultiplier,
  spendTalent,
  talentBonusFlat,
  talentBonusPercent,
  talentCritBonus,
  talentEffectValue,
  TALENT_DEFS,
  talentPointsInShoot,
  talentPointsSpent,
  talentPointsTotal,
  talentPointsUnspent,
  talentRank,
  talentsOpen,
  TALENT_SHOOTS,
  talentUnlockPending,
  TALENTS_UNLOCK_LEVEL,
  unlockTalents,
  weeklyMightMultiplier,
} from './talents';

export { formatCompact } from './format';

export type { BoostableStat, DropRarity, ItemBonus, ItemDef, ItemEffectId, ItemRarity } from './items';
export {
  availableRelics,
  describeItemBonus,
  describeItemBonusParts,
  doublableItems,
  itemDoubleFactor,
  ITEM_CATALOG,
  itemBonusPercent,
  itemFlatBonus,
  MAX_EQUIP_SLOTS,
  maxEquipSlots,
  recordRelicEarned,
  rollItemDrops,
  rollScavengerDrop,
} from './items';

export {
  createQuest,
  cumulativeSlotWeight,
  migrateQuest,
  migrateQuestUnlock,
  questRewardExp,
  questOverdueExp,
  questsOpen,
  questSlotExp,
  questUnlockPending,
  questWeekFor,
  questWeeklyTargetExp,
  QUESTS_UNLOCK_LEVEL,
  recordQuestCompletion,
  unlockQuests,
} from './quests';

export type { Rng } from './rng';
export { createRng, pickRandom, pickWeighted, shuffle } from './rng';

export { addDaysToDayKey, dailyPeriodKey, dayOfWeekIndex, daysBetweenDayKeys, msUntilRollover, periodKeyFor, weeklyPeriodKey } from './time';

export {
  activeBlind,
  activeSever,
  activeSunder,
  bloodlustActive,
  bloodlustDaysLeft,
  bossSkillEffectText,
  bossSkillMarks,
  doomDaysLeft,
  doomPct,
  frenzyActive,
  frenzyDaysLeft,
  hpHitDamage,
  reflectActive,
  reflectDaysLeft,
  resolveBreakpoints,
  resolveDoom,
  rollBossSkills,
  spendPassedBreakpoints,
  undyingActive,
} from './bossSkills';
export type { FiredBossSkill } from './bossSkills';
