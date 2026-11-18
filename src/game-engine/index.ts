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
  ShopStock,
  ShopWare,
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
  ServiceTurn,
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
  migrateLevelEvents,
  nameCharacter,
  randomizeStat,
} from './character';
export type { HeroClass } from './character';

export {
  addExpAndResolveLevelUps,
  clampHealthToMax,
  activeCritBoost,
  activeHealBoost,
  activeExpBoost,
  applyCritBoostEffect,
  applyExpBoost,
  applyHealBoostEffect,
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
  isFrozenOn,
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
  bossNumber,
  bossHealthGrowthRate,
  damageReductionPct,
  easeBossAttack,
  expectedLevelForBossIndex,
  generateBoss,
  withBossNumber,
  PERSONALITY_NAME,
  rescaleBossToHealthBands,
  resistPctForIndex,
  rollRunDifficultyModifier,
} from './boss';

export { assignSpecialIfEligible, assignUltIfEligible, grantLevelRewards, grantOverdrive } from './levelRewards';

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
  deathToll,
  reviveForGems,
  reviveState,
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
  getChallengeDef,
  markChallengeClaimed,
  recordBadCheck,
  seedChallenges,
} from './challenges';

export { characterGold } from './gold';

export type { Account } from './account';
export { addGems, claimPurse, createAccount, purseDue, recordLevel, spendGems } from './account';
export type { PrestigeMark, PrestigeRankDef, PrestigeSpecial } from './prestige';
export {
  canPrestige,
  deeperRootsCount,
  MAX_PRESTIGE,
  nextPrestigeRank,
  PRESTIGE_BONUS_PER_RANK,
  PRESTIGE_RANKS,
  prestigeBonusPercent,
  prestigeMark,
  prestigeOpensBetween,
  prestigeRank,
  withPrestige,
} from './prestige';
export type { SkinDef, SkinKind, SkinSlot } from './skins';
export { DEFAULT_SCENE_ART, SKIN_CATALOG, buySkin, heroArt, sceneArt, skinSlot, skinState, skinsFor, wearSkin, wornSkin } from './skins';
export { buyFreeze, freezeCost, pruneFrozenDays } from './freeze';
export { UNLOCK_LEVELS } from './constants/unlocks';
export type { UnlockId } from './constants/unlocks';
export { DEATH_SETBACK, FREEZE, GOLD_POUCH, PRESTIGE_GEMS, REVIVE_GEMS, SKIN_PRICES, TRIAL_GEMS, pouchGold, purseGold, restockFee, servicePrice, slotPrice, tonicPrice, warePrice } from './constants/economy';

export { TONIC_DEFS, buyTonic, buyWare, headlineFloor, restockShop, shopRarityShares, stockShop, tonicState, wareState } from './shop';
export type { TonicId } from './shop';
export { buyPouch, pouchState } from './vault';
export {
  SERVICE_DEFS,
  SERVICE_TURN_DAYS,
  buyEnchant,
  buyOverdrive,
  buyReroll,
  buySlot,
  enchantTargets,
  overdriveTargets,
  nextService,
  rerollTargets,
  serviceState,
  serviceTurn,
  syncServiceTurn,
  turnDaysLeft,
} from './services';
export type { ServiceId } from './services';

export type { TalentDef, TalentEffectId, TalentId, TalentShoot } from './talents';
export {
  bossKillHealPct,
  buyTalent,
  canBuyTalent,
  dodgeChancePct,
  healsCanCrit,
  isTalentUnlocked,
  lastStandFactor,
  levelUpHealBonusPct,
  milestoneExpMultiplier,
  nextTalentCost,
  questExpMultiplier,
  talentBonusFlat,
  talentBonusPercent,
  talentCritBonus,
  talentEffectValue,
  TALENT_DEFS,
  talentRanksBought,
  talentRanksInShoot,
  talentMaxRank,
  talentRank,
  talentsOpen,
  TALENT_SHOOTS,
  talentUnlockPending,
  TALENTS_UNLOCK_LEVEL,
  unlockTalents,
  weeklyMightMultiplier,
} from './talents';

export { formatCompact, formatDayKey } from './format';

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
  slotUpgradesOf,
  recordRelicEarned,
  rollItemDrops,
  itemDropCountOdds,
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

export { addDaysToDayKey, dailyPeriodKey, windowStartKey, dayOfWeekIndex, daysBetweenDayKeys, msUntilRollover, periodKeyFor, weekDayKeys, weekStartOf, weeklyPeriodKey } from './time';

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
