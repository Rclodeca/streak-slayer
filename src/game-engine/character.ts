import { easeBossAttack, rescaleBossToHealthBands } from './boss';
import { STARTING_GOLD } from './constants/economy';
import { TUNING } from './constants/tuning';
import { ITEM_CATALOG } from './items';
import { expCurveLevel, expToNextLevel } from './leveling';
import { effectiveStat } from './stats';
import { pickRandom, type Rng } from './rng';
import type { Boss, Character } from './types';

export function randomizeStat(base: number, rng: Rng): number {
  const jitter = (rng() * 2 - 1) * TUNING.STAT_RANDOMIZATION_PCT; // in [-0.05, 0.05]
  return base * (1 + jitter);
}

/**
 * A fresh, unnamed hero at level 1. `heroClass` limits the physical/magic
 * split to the ones that read as that hero (see heroClassFor); without it,
 * any split can roll.
 */
export function createCharacter(rng: Rng, heroClass?: HeroClass): Character {
  // Randomizes how the combined physical+magic pool is split so some runs
  // are balanced and others lean hard into one damage type — see
  // TUNING.DAMAGE_SPLIT_RATIOS.
  const splits = heroClass
    ? TUNING.DAMAGE_SPLIT_RATIOS.filter(([physical, magic]) => heroClassForShare(physical / (physical + magic)) === heroClass)
    : TUNING.DAMAGE_SPLIT_RATIOS;
  const [physicalShare, magicShare] = pickRandom(splits, rng);
  const damagePool = TUNING.BASE_STATS.physicalDamage + TUNING.BASE_STATS.magicDamage;
  const rolled = {
    physicalDamage: randomizeStat(damagePool * physicalShare, rng),
    magicDamage: randomizeStat(damagePool * magicShare, rng),
    healing: randomizeStat(TUNING.BASE_STATS.healing, rng),
    health: randomizeStat(TUNING.BASE_STATS.health, rng),
    trueDamage: randomizeStat(TUNING.BASE_STATS.trueDamage, rng),
  };
  const starterStats =
    heroClassFor({ starterStats: rolled }) === 'ranger'
      ? { ...rolled, trueDamage: rolled.trueDamage * TUNING.RANGER_TRUE_DAMAGE_MULTIPLIER }
      : rolled;
  return {
    level: 1,
    exp: 0,
    starterStats,
    currentHealth: starterStats.health,
    ownedItemIds: [],
    equippedItemIds: [],
    critChance: TUNING.BASE_CRIT_CHANCE,
    gold: STARTING_GOLD,
    questsUnlocked: false,
    talentsUnlocked: false,
    shopUnlocked: false,
    servicesUnlocked: false,
    looksUnlocked: false,
    heroPending: true,
    // Already at the post-rebalance baseline (BASE_STATS is already the
    // reduced value) — must be set here, not left undefined, or this fresh
    // character would get double-cut by applyDamagePoolRebalance the next
    // time it's saved and reloaded.
    damagePoolRebalanceApplied: true,
    healingRebalanceApplied: true,
    rankRebalanceApplied: true,
    healBoostApplied: true,
    healthGrowthBumpApplied: true,
    healBaseCutApplied: true,
    bossAttackEaseApplied: true,
    expCurveApplied: true,
  };
}

export type HeroClass = 'warrior' | 'cleric' | 'ranger';

// In the order the new-hero screen offers them. The cleric art reads as a
// mage, so it is called Mage on screen.
export const HERO_CLASSES: readonly HeroClass[] = ['warrior', 'cleric', 'ranger'];

// The items a hero may start with: one, at even odds, equipped when it is picked (chooseHero).
export const STARTER_ITEMS: Record<HeroClass, readonly string[]> = {
  warrior: ['rusty-blade', 'steel-sword'],
  cleric: ['apprentice-wand', 'arcane-staff'],
  ranger: ['bone-needle', 'assassins-edge'],
};

// Physical share of the starting physical+magic pool past which a run reads
// as leaning one way. DAMAGE_SPLIT_RATIOS only rolls 50/50, 60/40 or 70/30
// (either way) before ±5% jitter, so these cut cleanly between the even
// split and the leaning ones.
const WARRIOR_MIN_PHYSICAL_SHARE = 0.55;
const CLERIC_MAX_PHYSICAL_SHARE = 0.45;

/** The hero for a run, read off its starting stats: physical-leaning is a warrior, magic-leaning a cleric, an even split a ranger. A picked hero always rolls a split that reads as itself (see createCharacter). */
export function heroClassFor(character: Pick<Character, 'starterStats'>): HeroClass {
  const { physicalDamage, magicDamage } = character.starterStats;
  return heroClassForShare(physicalDamage / (physicalDamage + magicDamage));
}

function heroClassForShare(physicalShare: number): HeroClass {
  if (physicalShare >= WARRIOR_MIN_PHYSICAL_SHARE) return 'warrior';
  if (physicalShare <= CLERIC_MAX_PHYSICAL_SHARE) return 'cleric';
  return 'ranger';
}

export const MAX_HERO_NAME_LENGTH = 16;
export const DEFAULT_HERO_NAME = 'Nameless';

/** Names the hero: trimmed and capped at MAX_HERO_NAME_LENGTH, with a blank name becoming DEFAULT_HERO_NAME. */
export function nameCharacter(character: Character, rawName: string): Character {
  const name = rawName.trim().slice(0, MAX_HERO_NAME_LENGTH).trim() || DEFAULT_HERO_NAME;
  return { ...character, name };
}

/**
 * Backfills `starterStats.trueDamage` on a character saved before that stat
 * existed, so an old save continues its run instead of hitting NaN damage
 * everywhere it is read (the save's schemaVersion doesn't change for this —
 * the field is additive, not a shape break). Rolled the same way
 * `createCharacter` rolls every other stat; idempotent.
 *
 * Also drops the stray `starterStats.expGain` / `expGainRebalanceApplied` an
 * older save carries from before the expGain skill type was removed, the
 * `sideOnlyItemIds` pool from before relics, and the `newItemUnlockTiers`
 * from before every item could drop from level 1, and turns the single
 * `doubledItemId` from before two items could be enchanted into `doubledItemIds`.
 */
export function migrateCharacter(character: Character, rng: Rng): Character {
  const { trueDamage } = character.starterStats as Partial<Character['starterStats']>;
  const hasLegacyExpGain =
    'expGain' in character.starterStats || 'expGainRebalanceApplied' in (character as unknown as Record<string, unknown>);
  const needsStats = trueDamage === undefined;
  // The pre-relic side-only item pool is gone; drop the stray field (a pending
  // side quest that promised one of those items still pays it).
  const hasLegacySideOnly = 'sideOnlyItemIds' in (character as unknown as Record<string, unknown>);
  const hasLegacyTiers = 'newItemUnlockTiers' in (character as unknown as Record<string, unknown>);
  const hasLegacyDoubled = 'doubledItemId' in (character as unknown as Record<string, unknown>);
  // The once-per-boss revive mark is gone: a revive is open on every fall.
  const hasLegacyRevive = 'revivedAtBoss' in (character as unknown as Record<string, unknown>);
  if (!needsStats && !hasLegacySideOnly && !hasLegacyExpGain && !hasLegacyTiers && !hasLegacyDoubled && !hasLegacyRevive) return character;
  const starterStats = {
    ...character.starterStats,
    trueDamage: trueDamage ?? randomizeStat(TUNING.BASE_STATS.trueDamage, rng),
  };
  const migrated = { ...character, starterStats };
  delete (starterStats as { expGain?: number }).expGain;
  delete (migrated as { expGainRebalanceApplied?: boolean }).expGainRebalanceApplied;
  delete (migrated as { sideOnlyItemIds?: string[] }).sideOnlyItemIds;
  delete (migrated as { newItemUnlockTiers?: unknown }).newItemUnlockTiers;
  delete (migrated as { revivedAtBoss?: number }).revivedAtBoss;
  if (hasLegacyDoubled) {
    const { doubledItemId } = character as unknown as { doubledItemId?: string };
    delete (migrated as { doubledItemId?: string }).doubledItemId;
    if (doubledItemId) migrated.doubledItemIds = [...(migrated.doubledItemIds ?? []), doubledItemId];
  }
  return migrated;
}

const LEVEL_EVENT_FIELDS = ['takenEventIds', 'pendingEventPicks', 'offeredEventIds', 'offeredChallengeId', 'sideQuestPicksMissed', 'trialsUnlocked'] as const;

/**
 * Retires the level-up events on an older save: the `item-slots` events taken
 * (two slots each) become bought slots (`slotUpgrades`, unless the Shop
 * already set it), and the
 * event fields (taken, pending picks, offered cards, the side-quest guarantee
 * and the Trials unlock) are dropped, so a pending pick is not paid out. The
 * same character back when it holds none of them.
 */
export function migrateLevelEvents(character: Character): Character {
  const old = character as unknown as Record<string, unknown>;
  if (!LEVEL_EVENT_FIELDS.some((key) => key in old)) return character;
  const taken = (old.takenEventIds as string[] | undefined) ?? [];
  const bought = taken.includes('item-slots-2') ? 4 : taken.includes('item-slots') ? 2 : 0;
  const migrated = { ...character, slotUpgrades: character.slotUpgrades ?? bought };
  for (const key of LEVEL_EVENT_FIELDS) delete (migrated as unknown as Record<string, unknown>)[key];
  return migrated;
}

const CATALOG_ITEM_IDS = new Set(ITEM_CATALOG.map((item) => item.id));

/**
 * Drops item ids the catalog no longer has (the retired Dev mode art-trial
 * items, or any item removed later) so they can't sit invisibly in a slot.
 * Returns the same object when every id is still known.
 */
export function discardUnknownItems(character: Character): Character {
  const known = (id: string) => CATALOG_ITEM_IDS.has(id);
  const doubledUnknown = character.doubledItemIds?.some((id) => !known(id)) ?? false;
  if (character.ownedItemIds.every(known) && character.equippedItemIds.every(known) && !doubledUnknown) return character;
  return {
    ...character,
    ownedItemIds: character.ownedItemIds.filter(known),
    equippedItemIds: character.equippedItemIds.filter(known),
    doubledItemIds: character.doubledItemIds?.filter(known),
  };
}

/**
 * Items only exist while equipped: anything owned but not equipped is
 * discarded (and so returns to the drop pool). Covers saves from before that
 * rule, and drops still waiting in the in-memory popup queue when the page
 * was closed — a relic among those is un-earned too, so it can be offered
 * again rather than lost to a reload (a relic the player chose to drop has
 * already left ownedItemIds and stays earned). Returns the same object when
 * there is nothing to discard.
 */
export function discardUnequippedItems(character: Character): Character {
  const unequipped = character.ownedItemIds.filter((id) => !character.equippedItemIds.includes(id));
  if (unequipped.length === 0) return character;
  return {
    ...character,
    ownedItemIds: character.ownedItemIds.filter((id) => character.equippedItemIds.includes(id)),
    ...(character.earnedRelicIds && { earnedRelicIds: character.earnedRelicIds.filter((id) => !unequipped.includes(id)) }),
  };
}

/**
 * One-time migration for a run that predates the 2026-10-04 damage/healing
 * pool rebalance — see `damagePoolRebalanceApplied` on `Character`. Scales
 * only `physicalDamage`/`magicDamage`/`healing` down by
 * ONE_TIME_DAMAGE_POOL_REBALANCE_PCT; `health`/`trueDamage` are
 * deliberately left untouched. Idempotent via the flag, not via re-deriving
 * from `TUNING.BASE_STATS` — this must apply to whatever value is already
 * on the character (including its character-creation jitter and any level
 * growth since), not reset it to a fresh roll.
 */
export function applyDamagePoolRebalance(character: Character): Character {
  if (character.damagePoolRebalanceApplied) return character;
  const factor = 1 - TUNING.ONE_TIME_DAMAGE_POOL_REBALANCE_PCT / 100;
  return {
    ...character,
    starterStats: {
      ...character.starterStats,
      physicalDamage: character.starterStats.physicalDamage * factor,
      magicDamage: character.starterStats.magicDamage * factor,
      healing: character.starterStats.healing * factor,
    },
    damagePoolRebalanceApplied: true,
  };
}

/**
 * One-time migration for a run that predates the healing-only cut — see
 * `healingRebalanceApplied` on `Character`. Scales only `healing` down by
 * ONE_TIME_HEALING_REBALANCE_PCT, from whatever value is already on the
 * character (like applyDamagePoolRebalance, not a re-roll from BASE_STATS).
 */
export function applyHealingRebalance(character: Character): Character {
  if (character.healingRebalanceApplied) return character;
  const factor = 1 - TUNING.ONE_TIME_HEALING_REBALANCE_PCT / 100;
  return {
    ...character,
    starterStats: {
      ...character.starterStats,
      healing: character.starterStats.healing * factor,
    },
    healingRebalanceApplied: true,
  };
}

/**
 * One-time migration for a run that predates the healing boost — see
 * `healBoostApplied` on `Character`. Raises only `healing` by
 * ONE_TIME_HEAL_BOOST_FACTOR, from whatever value is already on the
 * character (like applyHealingRebalance, not a re-roll from BASE_STATS).
 */
export function applyHealBoost(character: Character): Character {
  if (character.healBoostApplied) return character;
  return {
    ...character,
    starterStats: {
      ...character.starterStats,
      healing: character.starterStats.healing * TUNING.ONE_TIME_HEAL_BOOST_FACTOR,
    },
    healBoostApplied: true,
  };
}

/**
 * One-time migration for a run that predates the steeper heal ranks — see
 * `healBaseCutApplied` on `Character`. Cuts only `healing` by
 * ONE_TIME_HEAL_BASE_CUT_FACTOR, from whatever value is already on the
 * character (like applyHealBoost, not a re-roll from BASE_STATS).
 */
export function applyHealBaseCut(character: Character): Character {
  if (character.healBaseCutApplied) return character;
  return {
    ...character,
    starterStats: {
      ...character.starterStats,
      healing: character.starterStats.healing * TUNING.ONE_TIME_HEAL_BASE_CUT_FACTOR,
    },
    healBaseCutApplied: true,
  };
}

/**
 * One-time migration for a run that predates the faster health growth — see
 * `healthGrowthBumpApplied` on `Character`. Max health is computed from
 * level, so it already grew; this scales currentHealth by the same factor so
 * the hero keeps the share of max health it had.
 */
export function applyHealthGrowthBump(character: Character): Character {
  if (character.healthGrowthBumpApplied) return character;
  const ratio = (1 + TUNING.LEVEL_HEALTH_HEALING_GROWTH_RATE) / (1 + TUNING.ONE_TIME_OLD_HEALTH_GROWTH_RATE);
  return { ...character, currentHealth: character.currentHealth * Math.pow(ratio, character.level - 1), healthGrowthBumpApplied: true };
}

/**
 * One-time migration for the skill-ranks rebalance: every skill now hits for
 * its type's full stat, so a saved run's physical, magic and true damage are
 * cut to ONE_TIME_RANK_REBALANCE_DAMAGE_FACTOR (healing and health
 * untouched), and its boss is rescaled to the new HP bands. A no-op, returning
 * both objects as-is, once `rankRebalanceApplied` is set.
 */
export function applyRankRebalance(character: Character, boss: Boss): { character: Character; boss: Boss } {
  if (character.rankRebalanceApplied) return { character, boss };
  const factor = TUNING.ONE_TIME_RANK_REBALANCE_DAMAGE_FACTOR;
  return {
    character: {
      ...character,
      starterStats: {
        ...character.starterStats,
        physicalDamage: character.starterStats.physicalDamage * factor,
        magicDamage: character.starterStats.magicDamage * factor,
        trueDamage: character.starterStats.trueDamage * factor,
      },
      rankRebalanceApplied: true,
    },
    boss: rescaleBossToHealthBands(boss),
  };
}

/**
 * One-time migration for the eased rare boss attacks (3x/4x/5x -> 2.5x/3x/3.5x)
 * and the retired random boss crit: rescales the saved boss's attack and drops
 * its `critChance` — see `easeBossAttack`. A no-op, returning both objects
 * as-is, once `bossAttackEaseApplied` is set.
 */
export function applyBossAttackEase(character: Character, boss: Boss): { character: Character; boss: Boss } {
  if (character.bossAttackEaseApplied) return { character, boss };
  return { character: { ...character, bossAttackEaseApplied: true }, boss: easeBossAttack(boss) };
}

/**
 * One-time migration for the 2026-11-18 EXP curve: a saved run's level moves
 * to its place on the new curve (expCurveLevel), so the hero keeps the stats
 * the old level gave them. The EXP into the level and the share of max health
 * carry over. A no-op once `expCurveApplied` is set.
 */
export function applyExpCurve(character: Character): Character {
  if (character.expCurveApplied) return character;
  const level = expCurveLevel(character.level);
  const share = character.exp / expToNextLevel(character.level);
  const moved: Character = { ...character, level, exp: share * expToNextLevel(level), expCurveApplied: true };
  const before = effectiveStat(character, 'health');
  return { ...moved, currentHealth: before > 0 ? (character.currentHealth / before) * effectiveStat(moved, 'health') : character.currentHealth };
}
