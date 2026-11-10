import { HEAL_CRIT_MULTIPLIER, LAST_STAND_BELOW_PCT, TALENT_DEFS } from './constants/talentTree';
import type { TalentDef, TalentEffectId, TalentId, TalentShoot } from './constants/talentTree';
import type { BoostableStat } from './items';
import type { Character, Habit } from './types';

export { TALENT_DEFS, TALENT_SHOOTS } from './constants/talentTree';
export type { TalentDef, TalentEffectId, TalentId, TalentShoot } from './constants/talentTree';

/** The player level at which the Talents tab opens, each run. */
export const TALENTS_UNLOCK_LEVEL = 5;

/** Whether the Talents tab is open: unlocked this run, or at the unlock level with its popup up. */
export function talentsOpen(character: Pick<Character, 'level' | 'talentsUnlocked'>): boolean {
  return character.talentsUnlocked === true || character.level >= TALENTS_UNLOCK_LEVEL;
}

/** Whether the "Talents unlocked" popup is due: the unlock level reached this run and the tab not yet opened. A save from before talents shows it once. */
export function talentUnlockPending(character: Pick<Character, 'level' | 'talentsUnlocked'>): boolean {
  return !character.talentsUnlocked && character.level >= TALENTS_UNLOCK_LEVEL;
}

/** Opens the Talents tab for the rest of the run (the "Talents unlocked" popup's Onward). The same character back if it is already open. */
export function unlockTalents(character: Character): Character {
  return character.talentsUnlocked ? character : { ...character, talentsUnlocked: true };
}

/** Ranks spent on `id` (0 for a node never spent on, or an id the tree no longer has). */
export function talentRank(character: Pick<Character, 'talents'>, id: TalentId): number {
  return character.talents?.[id] ?? 0;
}

/** Talent points earned this run: one per level gained, never stored. */
export function talentPointsTotal(character: Pick<Character, 'level'>): number {
  return Math.max(0, character.level - 1);
}

/** Ranks spent across the whole tree. */
export function talentPointsSpent(character: Pick<Character, 'talents'>): number {
  return TALENT_DEFS.reduce((sum, def) => sum + talentRank(character, def.id), 0);
}

/** Points earned and not yet spent. */
export function talentPointsUnspent(character: Pick<Character, 'level' | 'talents'>): number {
  return Math.max(0, talentPointsTotal(character) - talentPointsSpent(character));
}

/** Ranks spent in one shoot, for the plinths. */
export function talentPointsInShoot(character: Pick<Character, 'talents'>, shoot: TalentShoot): number {
  return TALENT_DEFS.filter((def) => def.shoot === shoot).reduce((sum, def) => sum + talentRank(character, def.id), 0);
}

function defFor(id: TalentId): TalentDef | undefined {
  return TALENT_DEFS.find((def) => def.id === id);
}

/**
 * Whether `id` can take ranks yet. The first main node of a shoot is always
 * open; each later main node opens once the main node before it has a rank;
 * an offshoot opens once its parent has a rank; the top node (★) opens once
 * every main node of its shoot is full (offshoots don't count).
 */
export function isTalentUnlocked(character: Pick<Character, 'talents'>, id: TalentId): boolean {
  const def = defFor(id);
  if (!def) return false;
  const mains = TALENT_DEFS.filter((other) => other.shoot === def.shoot && other.kind === 'main');
  switch (def.kind) {
    case 'main': {
      const index = mains.findIndex((main) => main.id === id);
      return index === 0 || talentRank(character, mains[index - 1].id) > 0;
    }
    case 'offshoot':
      return def.parent !== undefined && talentRank(character, def.parent) > 0;
    case 'top':
      return mains.every((main) => talentRank(character, main.id) >= main.maxRank);
  }
}

/** Whether one more rank can go into `id` right now: the tab is open, a point is free, the node is open and not full. */
export function canSpendTalent(character: Pick<Character, 'level' | 'talents' | 'talentsUnlocked'>, id: TalentId): boolean {
  const def = defFor(id);
  if (!def) return false;
  return talentsOpen(character) && talentPointsUnspent(character) > 0 && isTalentUnlocked(character, id) && talentRank(character, id) < def.maxRank;
}

/**
 * Spends one point on `id`. The same character back if it can't be spent.
 * Spent points never move. Max health can change with a rank (Vigor), so the
 * caller clamps current health to the new max, as equipping an item does.
 */
export function spendTalent(character: Character, id: TalentId): Character {
  if (!canSpendTalent(character, id)) return character;
  return { ...character, talents: { ...character.talents, [id]: talentRank(character, id) + 1 } };
}

/** Summed per-rank percent of every talent that boosts `stat`; added to equipped items' in itemBonusPercent. */
export function talentBonusPercent(character: Pick<Character, 'talents'>, stat: BoostableStat): number {
  let total = 0;
  for (const def of TALENT_DEFS) {
    for (const bonus of def.bonuses ?? []) if (bonus.stat === stat && bonus.percent) total += bonus.percent * talentRank(character, def.id);
  }
  return total;
}

/** Summed per-rank flat amount of every talent that boosts `stat`; added to equipped items' in itemFlatBonus. */
export function talentBonusFlat(character: Pick<Character, 'talents'>, stat: BoostableStat): number {
  let total = 0;
  for (const def of TALENT_DEFS) {
    for (const bonus of def.bonuses ?? []) if (bonus.stat === stat && bonus.flat) total += bonus.flat * talentRank(character, def.id);
  }
  return total;
}

/** What the talents with `effect` add up to over their ranks (see TalentEffectId for the units). 0 with none. */
export function talentEffectValue(character: Pick<Character, 'talents'>, effect: TalentEffectId): number {
  let total = 0;
  for (const def of TALENT_DEFS) if (def.effect?.id === effect) total += def.effect.perRank * talentRank(character, def.id);
  return total;
}

/**
 * Weekly Might: the multiplier on damage from a weekly skill, on top of the
 * weekly bonus and Moonwell. Healing from a weekly skill and every daily are
 * left alone (1).
 */
export function weeklyMightMultiplier(character: Pick<Character, 'talents'>, habit: Pick<Habit, 'period' | 'damageType'>): number {
  if (habit.period !== 'weekly' || habit.damageType === 'healing') return 1;
  return 1 + talentEffectValue(character, 'weeklyDamage') / 100;
}

/** Keen Edge and Executioner: what a damage crit's multiplier gains (0.7 at full ranks). */
export function talentCritBonus(character: Pick<Character, 'talents'>): number {
  return talentEffectValue(character, 'critMultiplier');
}

/** Blessed: whether heal skills roll to crit. */
export function healsCanCrit(character: Pick<Character, 'talents'>): boolean {
  return talentEffectValue(character, 'healCrit') > 0;
}

export { HEAL_CRIT_MULTIPLIER };

/**
 * Last Stand: the factor on damage from a boss hit while the hero's health is
 * below LAST_STAND_BELOW_PCT of `maxHealth` (checked before the hit lands), else 1.
 */
export function lastStandFactor(character: Pick<Character, 'talents' | 'currentHealth'>, maxHealth: number): number {
  if (character.currentHealth >= (maxHealth * LAST_STAND_BELOW_PCT) / 100) return 1;
  return 1 - talentEffectValue(character, 'lastStand') / 100;
}

/** Unbroken: the percent chance to dodge a boss hit (0 without it). */
export function dodgeChancePct(character: Pick<Character, 'talents'>): number {
  return talentEffectValue(character, 'dodge');
}

/** Waymark: the multiplier on EXP a streak milestone pays. */
export function milestoneExpMultiplier(character: Pick<Character, 'talents'>): number {
  return 1 + talentEffectValue(character, 'milestoneExp') / 100;
}

/** Wisdom: the multiplier on EXP a quest pays. */
export function questExpMultiplier(character: Pick<Character, 'talents'>): number {
  return 1 + talentEffectValue(character, 'questExp') / 100;
}

/** Renewal and Renewal II: percent of max HP a level-up heals on top of the base and Sage's Codex. */
export function levelUpHealBonusPct(character: Pick<Character, 'talents'>): number {
  return talentEffectValue(character, 'levelUpHeal');
}

/** Second Wind: percent of max HP healed when a boss falls. */
export function bossKillHealPct(character: Pick<Character, 'talents'>): number {
  return talentEffectValue(character, 'bossKillHeal');
}
