import {
  Anvil,
  Bandage,
  Calendar,
  Castle,
  ChevronsUp,
  Crosshair,
  Droplet,
  Gift,
  Heart,
  HeartPlus,
  HeartPulse,
  Milestone,
  Orbit,
  ScrollText,
  Shield,
  ShieldHalf,
  ShieldOff,
  Skull,
  Sparkles,
  Sun,
  Sword,
  Swords,
  Target,
  WandSparkles,
  Wind,
  Zap,
} from 'lucide-vue-next';
import type { Component } from 'vue';
import { isTalentUnlocked, talentRank, TALENT_DEFS } from '../../game-engine';
import type { Character, TalentDef, TalentEffectId, TalentId, TalentShoot } from '../../game-engine';

// How the Talents tab draws each node and shoot (docs/mockups/pixel-talents.html):
// the app's own lucide icons, coloured with the stat colours the theme sets.
export interface TalentLook {
  icon: Component;
  color: string;
}

const PHYS = 'var(--dmg-physical)';
const MAGIC = 'var(--dmg-magic)';
const HEAL = 'var(--dmg-healing)';
const TRUE = 'var(--dmg-true)';
const CRIT = 'var(--icon-crit)';
const STEEL = 'var(--icon-steel)';
const ARCANE = 'var(--icon-arcane)';
const VIOLET = 'var(--icon-violet)';
const HEALTH = 'var(--icon-health)';
const EXP = 'var(--icon-exp)';
const GOLD = 'var(--icon-gold)';
const LIFESTEAL = 'var(--icon-lifesteal)';

export const SHOOT_LOOK: Record<TalentShoot, TalentLook & { name: string }> = {
  damage: { name: 'Damage', icon: Swords, color: PHYS },
  tank: { name: 'Tank', icon: Shield, color: STEEL },
  support: { name: 'Support', icon: HeartPulse, color: HEAL },
};

export const TALENT_LOOK: Record<TalentId, TalentLook> = {
  might: { icon: Swords, color: PHYS },
  precision: { icon: Crosshair, color: CRIT },
  'keen-edge': { icon: Target, color: CRIT },
  brawn: { icon: Sword, color: PHYS },
  'armor-break': { icon: ShieldOff, color: STEEL },
  arcana: { icon: WandSparkles, color: MAGIC },
  'spell-break': { icon: Orbit, color: VIOLET },
  'might-2': { icon: Swords, color: PHYS },
  truestrike: { icon: Zap, color: TRUE },
  'weekly-might': { icon: Calendar, color: GOLD },
  'precision-2': { icon: Crosshair, color: CRIT },
  'armor-break-2': { icon: ShieldOff, color: STEEL },
  'spell-break-2': { icon: Orbit, color: VIOLET },
  executioner: { icon: Skull, color: PHYS },
  vigor: { icon: Heart, color: HEALTH },
  plating: { icon: Shield, color: STEEL },
  'iron-hide': { icon: Shield, color: STEEL },
  warding: { icon: ShieldHalf, color: ARCANE },
  'spell-hide': { icon: ShieldHalf, color: ARCANE },
  'vigor-2': { icon: Heart, color: HEALTH },
  'last-stand': { icon: Bandage, color: PHYS },
  bastion: { icon: Castle, color: STEEL },
  'plating-2': { icon: Shield, color: STEEL },
  'warding-2': { icon: ShieldHalf, color: ARCANE },
  unbroken: { icon: Wind, color: STEEL },
  mending: { icon: HeartPulse, color: HEAL },
  renewal: { icon: ChevronsUp, color: EXP },
  scavenger: { icon: Gift, color: GOLD },
  insight: { icon: Sparkles, color: EXP },
  wisdom: { icon: ScrollText, color: STEEL },
  waymark: { icon: Milestone, color: EXP },
  'mending-2': { icon: HeartPulse, color: HEAL },
  'second-wind': { icon: HeartPlus, color: HEAL },
  'renewal-2': { icon: ChevronsUp, color: EXP },
  leech: { icon: Droplet, color: LIFESTEAL },
  blessed: { icon: Sun, color: GOLD },
};

/** The tab's own icon (the tab bar, the banner), and the unlock popup's. */
export const TALENTS_TAB_ICON = Anvil;

/** What a node does, in a sentence: "+3% physical damage per rank." (no "per rank" on a single-rank node). */
export function talentDescription(def: TalentDef): string {
  return def.maxRank > 1 ? `${def.text} per rank.` : `${def.text}.`;
}

/** A sum rounded to 2 places, so 3 × 0.1 reads 0.3. */
const trim = (n: number) => Number(n.toFixed(2));

const EFFECT_AMOUNT: Record<TalentEffectId, (total: number) => string> = {
  critMultiplier: (v) => `+${v}×`,
  weeklyDamage: (v) => `+${v}%`,
  lastStand: (v) => `−${v}%`,
  dodge: (v) => `${v}% dodge`,
  levelUpHeal: (v) => `+${v}%`,
  bossKillHeal: (v) => `+${v}%`,
  extraDrop: (v) => `${v}%`,
  questExp: (v) => `+${v}%`,
  milestoneExp: (v) => `+${v}%`,
  healCrit: () => 'Heal crits',
};

/** What `rank` ranks of a node add up to, short, for the popup's Now and Next plates ("—" at 0). */
export function talentAmount(def: TalentDef, rank: number): string {
  if (rank <= 0) return '—';
  if (def.effect) return EFFECT_AMOUNT[def.effect.id](trim(def.effect.perRank * rank));
  const bonuses = def.bonuses ?? [];
  const first = bonuses[0];
  if (!first) return '—';
  if (first.percent !== undefined) return `+${trim(first.percent * rank)}%`;
  const flat = `+${trim((first.flat ?? 0) * rank)}`;
  return bonuses.length > 1 ? `${flat} each` : flat;
}

/** Why a node can't take a rank yet, or null when it is open. */
export function talentLockReason(character: Pick<Character, 'talents'>, def: TalentDef): string | null {
  if (isTalentUnlocked(character, def.id)) return null;
  if (def.kind === 'top') return 'Needs every main node full.';
  if (def.kind === 'offshoot') return `Needs a rank in ${nameOf(def.parent)}.`;
  const mains = TALENT_DEFS.filter((other) => other.shoot === def.shoot && other.kind === 'main');
  return `Needs a rank in ${mains[mains.findIndex((main) => main.id === def.id) - 1].name}.`;
}

function nameOf(id: TalentId | undefined): string {
  return TALENT_DEFS.find((def) => def.id === id)?.name ?? '';
}

/** How a node reads on the tree: locked (sunk grey), open (silver, tap it), has (a rank or more, brass) or full (every rank, lit brass). */
export type TalentState = 'locked' | 'open' | 'has' | 'full';

export function talentState(character: Pick<Character, 'talents'>, def: TalentDef): TalentState {
  const rank = talentRank(character, def.id);
  if (rank >= def.maxRank) return 'full';
  if (rank > 0) return 'has';
  return isTalentUnlocked(character, def.id) ? 'open' : 'locked';
}
