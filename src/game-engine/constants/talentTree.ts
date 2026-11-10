import type { BoostableStat } from '../items';

export type TalentShoot = 'damage' | 'tank' | 'support';

/** The shoots in the order the Talents tab lists them. */
export const TALENT_SHOOTS: readonly TalentShoot[] = ['damage', 'tank', 'support'];

export type TalentId =
  // Damage
  | 'might'
  | 'precision'
  | 'keen-edge'
  | 'brawn'
  | 'armor-break'
  | 'arcana'
  | 'spell-break'
  | 'might-2'
  | 'truestrike'
  | 'weekly-might'
  | 'precision-2'
  | 'armor-break-2'
  | 'spell-break-2'
  | 'executioner'
  // Tank
  | 'vigor'
  | 'plating'
  | 'iron-hide'
  | 'warding'
  | 'spell-hide'
  | 'vigor-2'
  | 'last-stand'
  | 'bastion'
  | 'plating-2'
  | 'warding-2'
  | 'unbroken'
  // Support
  | 'mending'
  | 'renewal'
  | 'scavenger'
  | 'insight'
  | 'wisdom'
  | 'waymark'
  | 'mending-2'
  | 'second-wind'
  | 'renewal-2'
  | 'leech'
  | 'blessed';

/**
 * What a node with no plain stat does, summed over its ranks by
 * talentEffectValue (see talents.ts for where each one is read):
 * - critMultiplier: added to a damage crit's multiplier (0.1 is +0.1×).
 * - weeklyDamage: percent more damage from weekly skills.
 * - lastStand: percent less damage taken from boss hits below LAST_STAND_BELOW_PCT of max health.
 * - dodge: percent chance to dodge a boss hit from a missed skill, a missed quest or Give in.
 * - levelUpHeal: percent of max health a level-up heals on top of the base.
 * - bossKillHeal: percent of max health healed when a boss falls.
 * - extraDrop: percent chance of one extra item when a boss falls.
 * - questExp: percent more quest EXP.
 * - milestoneExp: percent more EXP from streak milestones.
 * - healCrit: heal skills can crit (for 2×).
 */
export type TalentEffectId =
  | 'critMultiplier'
  | 'weeklyDamage'
  | 'lastStand'
  | 'dodge'
  | 'levelUpHeal'
  | 'bossKillHeal'
  | 'extraDrop'
  | 'questExp'
  | 'milestoneExp'
  | 'healCrit';

export interface TalentDef {
  id: TalentId;
  name: string;
  shoot: TalentShoot;
  /** 'main' nodes form the trunk, each opening the next; an 'offshoot' hangs off one main node; the 'top' (★) closes the shoot. */
  kind: 'main' | 'offshoot' | 'top';
  /** The main node an offshoot hangs off. */
  parent?: TalentId;
  maxRank: number;
  /** Plain stat bonuses per rank, summed with equipped items' (see talentBonusPercent / talentBonusFlat). */
  bonuses?: { stat: BoostableStat; percent?: number; flat?: number }[];
  /** What a node without a plain stat does, and how much each rank adds. */
  effect?: { id: TalentEffectId; perRank: number };
  /** One plain line on what a rank does, for the tab. */
  text: string;
}

type Stat = NonNullable<TalentDef['bonuses']>[number];
const percent = (stat: BoostableStat, amount: number): Stat => ({ stat, percent: amount });
const flat = (stat: BoostableStat, amount: number): Stat => ({ stat, flat: amount });

// Each shoot lists its main nodes foot to top with offshoots right after their
// parent; the ★ is last. The order is the unlock order (see isTalentUnlocked).
export const TALENT_DEFS: readonly TalentDef[] = [
  // Damage — 39 points, 18 to the top
  { id: 'might', name: 'Might', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('allDamage', 2)], text: '+2% all damage' },
  { id: 'precision', name: 'Precision', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('critChance', 1)], text: '+1% crit chance' },
  { id: 'keen-edge', name: 'Keen Edge', shoot: 'damage', kind: 'offshoot', parent: 'precision', maxRank: 2, effect: { id: 'critMultiplier', perRank: 0.1 }, text: 'Crits deal +0.1×' },
  { id: 'brawn', name: 'Brawn', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('physicalDamage', 3)], text: '+3% physical damage' },
  { id: 'armor-break', name: 'Armor Break', shoot: 'damage', kind: 'offshoot', parent: 'brawn', maxRank: 3, bonuses: [percent('armorPen', 2)], text: '+2% armor pen' },
  { id: 'arcana', name: 'Arcana', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('magicDamage', 3)], text: '+3% magic damage' },
  { id: 'spell-break', name: 'Spell Break', shoot: 'damage', kind: 'offshoot', parent: 'arcana', maxRank: 3, bonuses: [percent('magicPen', 2)], text: '+2% magic pen' },
  { id: 'might-2', name: 'Might II', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('allDamage', 2)], text: '+2% all damage' },
  { id: 'truestrike', name: 'Truestrike', shoot: 'damage', kind: 'offshoot', parent: 'might-2', maxRank: 3, bonuses: [percent('trueDamage', 4)], text: '+4% true damage' },
  { id: 'weekly-might', name: 'Weekly Might', shoot: 'damage', kind: 'offshoot', parent: 'might-2', maxRank: 3, effect: { id: 'weeklyDamage', perRank: 5 }, text: '+5% damage from weekly skills' },
  { id: 'precision-2', name: 'Precision II', shoot: 'damage', kind: 'main', maxRank: 3, bonuses: [percent('critChance', 1)], text: '+1% crit chance' },
  { id: 'armor-break-2', name: 'Armor Break II', shoot: 'damage', kind: 'offshoot', parent: 'precision-2', maxRank: 3, bonuses: [percent('armorPen', 2)], text: '+2% armor pen' },
  { id: 'spell-break-2', name: 'Spell Break II', shoot: 'damage', kind: 'offshoot', parent: 'precision-2', maxRank: 3, bonuses: [percent('magicPen', 2)], text: '+2% magic pen' },
  { id: 'executioner', name: 'Executioner', shoot: 'damage', kind: 'top', maxRank: 1, effect: { id: 'critMultiplier', perRank: 0.5 }, text: 'Crits deal +0.5×' },

  // Tank — 29 points, 15 to the top
  { id: 'vigor', name: 'Vigor', shoot: 'tank', kind: 'main', maxRank: 3, bonuses: [percent('health', 3)], text: '+3% max HP' },
  { id: 'plating', name: 'Plating', shoot: 'tank', kind: 'main', maxRank: 3, bonuses: [flat('armor', 25)], text: '+25 armor' },
  { id: 'iron-hide', name: 'Iron Hide', shoot: 'tank', kind: 'offshoot', parent: 'plating', maxRank: 2, bonuses: [flat('armor', 25)], text: '+25 armor' },
  { id: 'warding', name: 'Warding', shoot: 'tank', kind: 'main', maxRank: 3, bonuses: [flat('magicResist', 25)], text: '+25 magic resist' },
  { id: 'spell-hide', name: 'Spell Hide', shoot: 'tank', kind: 'offshoot', parent: 'warding', maxRank: 2, bonuses: [flat('magicResist', 25)], text: '+25 magic resist' },
  { id: 'vigor-2', name: 'Vigor II', shoot: 'tank', kind: 'main', maxRank: 3, bonuses: [percent('health', 3)], text: '+3% max HP' },
  { id: 'last-stand', name: 'Last Stand', shoot: 'tank', kind: 'offshoot', parent: 'vigor-2', maxRank: 3, effect: { id: 'lastStand', perRank: 5 }, text: '−5% damage taken while below 25% HP' },
  { id: 'bastion', name: 'Bastion', shoot: 'tank', kind: 'main', maxRank: 3, bonuses: [flat('armor', 25), flat('magicResist', 25)], text: '+25 armor and +25 magic resist' },
  { id: 'plating-2', name: 'Plating II', shoot: 'tank', kind: 'offshoot', parent: 'bastion', maxRank: 3, bonuses: [flat('armor', 25)], text: '+25 armor' },
  { id: 'warding-2', name: 'Warding II', shoot: 'tank', kind: 'offshoot', parent: 'bastion', maxRank: 3, bonuses: [flat('magicResist', 25)], text: '+25 magic resist' },
  { id: 'unbroken', name: 'Unbroken', shoot: 'tank', kind: 'top', maxRank: 1, effect: { id: 'dodge', perRank: 10 }, text: '10% chance to dodge a boss hit' },

  // Support — 29 points, 17 to the top
  { id: 'mending', name: 'Mending', shoot: 'support', kind: 'main', maxRank: 3, bonuses: [percent('healing', 3)], text: '+3% healing' },
  { id: 'renewal', name: 'Renewal', shoot: 'support', kind: 'main', maxRank: 3, effect: { id: 'levelUpHeal', perRank: 2 }, text: 'Level-ups heal +2% of max HP' },
  { id: 'scavenger', name: 'Scavenger', shoot: 'support', kind: 'offshoot', parent: 'renewal', maxRank: 3, effect: { id: 'extraDrop', perRank: 5 }, text: '+5% chance of one extra item when a boss falls' },
  { id: 'insight', name: 'Insight', shoot: 'support', kind: 'main', maxRank: 3, bonuses: [percent('expGain', 2)], text: '+2% EXP' },
  { id: 'wisdom', name: 'Wisdom', shoot: 'support', kind: 'offshoot', parent: 'insight', maxRank: 2, effect: { id: 'questExp', perRank: 3 }, text: '+3% quest EXP' },
  { id: 'waymark', name: 'Waymark', shoot: 'support', kind: 'offshoot', parent: 'insight', maxRank: 3, effect: { id: 'milestoneExp', perRank: 5 }, text: '+5% EXP from streak milestones' },
  { id: 'mending-2', name: 'Mending II', shoot: 'support', kind: 'main', maxRank: 3, bonuses: [percent('healing', 3)], text: '+3% healing' },
  { id: 'second-wind', name: 'Second Wind', shoot: 'support', kind: 'offshoot', parent: 'mending-2', maxRank: 3, effect: { id: 'bossKillHeal', perRank: 2 }, text: 'Heal +2% of max HP when a boss falls' },
  { id: 'renewal-2', name: 'Renewal II', shoot: 'support', kind: 'main', maxRank: 3, effect: { id: 'levelUpHeal', perRank: 2 }, text: 'Level-ups heal +2% of max HP' },
  { id: 'leech', name: 'Leech', shoot: 'support', kind: 'main', maxRank: 2, bonuses: [percent('lifesteal', 0.5)], text: '+0.5% lifesteal' },
  { id: 'blessed', name: 'Blessed', shoot: 'support', kind: 'top', maxRank: 1, effect: { id: 'healCrit', perRank: 1 }, text: 'Heal skills can crit, for double healing' },
];

/** Last Stand only applies while the hero's health is below this share of max. */
export const LAST_STAND_BELOW_PCT = 25;

/** A heal crit's multiplier: flat, unaffected by Keen Edge, Executioner or Voidcaller's Scepter. */
export const HEAL_CRIT_MULTIPLIER = 2;
