// The sim player's choices, kept to a few plain rules: which items to wear,
// which talents to buy, when to drink a Health Potion. See
// docs/superpowers/specs/2026-11-18-run-sim-design.md, "Calls made in the build".

import { ITEM_CATALOG } from '../../src/game-engine/constants/itemCatalog';
import { TALENT_DEFS } from '../../src/game-engine/constants/talentTree';
import type { TalentId } from '../../src/game-engine/constants/talentTree';
import { POTION_STOCK_DAYS } from '../../src/game-engine/constants/economy';
import { TUNING } from '../../src/game-engine/constants/tuning';
import { maxEquipSlots } from '../../src/game-engine/items';
import type { ItemDef, ItemRarity } from '../../src/game-engine/items';
import { clampHealthToMax, effectiveStat } from '../../src/game-engine/leveling';
import { buyTalent, canBuyTalent, nextTalentCost } from '../../src/game-engine/talents';
import type { Rng } from '../../src/game-engine/rng';
import type { Character, Habit } from '../../src/game-engine/types';

const RARITY_RANK: Record<ItemRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, relic: 4 };
const EFFECT_SCORE: Record<ItemRarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 15, relic: 20 };
const byId = new Map(ITEM_CATALOG.map((item) => [item.id, item]));

/** What share of the hero's good habits deal each damage type. */
function typeShares(habits: Habit[]): Record<'physical' | 'magic' | 'trueDamage' | 'healing', number> {
  const good = habits.filter((h) => !h.isBad);
  const share = (t: Habit['damageType']) => good.filter((h) => h.damageType === t).length / Math.max(1, good.length);
  return { physical: share('physical'), magic: share('magic'), trueDamage: share('trueDamage'), healing: share('healing') };
}

/** An item's worth as a damage item and as a utility (tank, support, EXP) item, for this hero's habits. */
function scoreItem(item: ItemDef, habits: Habit[], expRush = false): { damage: number; utility: number } {
  const s = typeShares(habits);
  const dealing = s.physical + s.magic + s.trueDamage;
  let damage = 0;
  let utility = 0;
  for (const b of item.bonuses) {
    const pct = b.percent ?? 0;
    const flat = b.flat ?? 0;
    switch (b.stat) {
      case 'physicalDamage': damage += pct * s.physical + flat * 0.05 * s.physical; break;
      case 'magicDamage': damage += pct * s.magic + flat * 0.05 * s.magic; break;
      case 'trueDamage': damage += pct * s.trueDamage + flat * 0.05 * s.trueDamage; break;
      case 'allDamage': damage += pct * dealing; break;
      case 'critChance': damage += pct * dealing; break;
      case 'armorPen': damage += pct * 0.5 * s.physical; break;
      case 'magicPen': damage += pct * 0.5 * s.magic; break;
      case 'healing': utility += pct * (0.4 + s.healing); break;
      case 'health': utility += pct + flat * 0.01; break;
      case 'lifesteal': utility += pct * 1.5; break;
      // An EXP rush wears EXP before anything else.
      case 'expGain': if (expRush) damage += pct * 20; else utility += pct; break;
      case 'armor':
      case 'magicResist': utility += flat * 0.03; break;
    }
  }
  if (item.effect) {
    if (damage >= utility) damage += EFFECT_SCORE[item.rarity];
    else utility += EFFECT_SCORE[item.rarity];
  }
  return { damage, utility };
}

/** Utility slots kept for tank, support and EXP items: 1 at 4 slots, 2 at 6, 3 at 8. */
export function utilitySlots(slots: number): number {
  return Math.max(1, Math.floor((slots - 2) / 2));
}

/**
 * Wears the best set from what the hero owns and drops the rest (there's no
 * pack): the best damage items, plus the best utility items in the utility
 * slots, ties to the higher rarity. A slot with nothing for it takes the
 * other kind's next best.
 */
export function chooseGear(character: Character, habits: Habit[], expRush = false): Character {
  const slots = maxEquipSlots(character);
  const owned = [...new Set(character.ownedItemIds)].map((id) => byId.get(id)).filter((item): item is ItemDef => !!item);
  const scored = owned.map((item) => ({ item, ...scoreItem(item, habits, expRush) }));
  const byScore = (key: 'damage' | 'utility') => (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    b[key] - a[key] || RARITY_RANK[b.item.rarity] - RARITY_RANK[a.item.rarity];
  const damageItems = scored.filter((x) => x.damage >= x.utility).sort(byScore('damage'));
  const utilityItems = scored.filter((x) => x.damage < x.utility).sort(byScore('utility'));
  const util = Math.min(utilitySlots(slots), utilityItems.length);
  const pick = [...utilityItems.slice(0, util), ...damageItems.slice(0, slots - util)];
  const rest = [...damageItems.slice(slots - util), ...utilityItems.slice(util)].sort((a, b) => Math.max(b.damage, b.utility) - Math.max(a.damage, a.utility));
  while (pick.length < slots && rest.length) pick.push(rest.shift()!);
  const ids = pick.map((x) => x.item.id);
  return clampHealthToMax({
    ...character,
    ownedItemIds: ids,
    equippedItemIds: ids,
    doubledItemIds: character.doubledItemIds?.filter((id) => ids.includes(id)),
  });
}

/** The rarities worn, as counts. */
export function gearRarities(character: Character): Record<ItemRarity, number> {
  const counts: Record<ItemRarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, relic: 0 };
  for (const id of character.equippedItemIds) {
    const item = byId.get(id);
    if (item) counts[item.rarity]++;
  }
  return counts;
}

const SHOOT_WEIGHTS = [['damage', 0.7], ['tank', 0.15], ['support', 0.15]] as const;

/**
 * Buys talents while the talent budget (a share of all gold earned) covers the
 * next rank: a shoot at random by SHOOT_WEIGHTS among those with a node to
 * buy, then a node at random in it. Returns the character and gold spent.
 */
export function buyTalents(character: Character, bossIndex: number, budget: number, rng: Rng): { character: Character; spent: number; bought: number } {
  let spent = 0;
  let bought = 0;
  for (let guard = 0; guard < 200; guard++) {
    const cost = nextTalentCost(character, bossIndex).gold;
    if (spent + cost > budget) break;
    const open = TALENT_DEFS.filter((def) => canBuyTalent(character, 1e9, def.id as TalentId, bossIndex));
    if (!open.length) break;
    const shoots = SHOOT_WEIGHTS.filter(([shoot]) => open.some((def) => def.shoot === shoot));
    const total = shoots.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    const shoot = shoots.find(([, w]) => (roll -= w) < 0)?.[0] ?? shoots[0][0];
    const nodes = open.filter((def) => def.shoot === shoot);
    const def = nodes[Math.floor(rng() * nodes.length)];
    const result = buyTalent(character, 1e9, def.id as TalentId, bossIndex);
    if (!result) break;
    character = clampHealthToMax(result.character);
    spent += cost;
    bought++;
  }
  return { character, spent, bought };
}

const POTION_BELOW = 0.3;

/** Drinks a Health Potion when health is under 30%, once per potion window. Returns the character and whether one was drunk. */
export function maybeDrinkPotion(character: Character, day: number, lastWindow: number): { character: Character; window: number } {
  const window = Math.floor(day / POTION_STOCK_DAYS);
  const max = effectiveStat(character, 'health');
  if (window === lastWindow || Math.round(character.currentHealth) <= 0 || character.currentHealth >= max * POTION_BELOW) return { character, window: lastWindow };
  const healed = Math.min(max, character.currentHealth + (max * TUNING.DRAUGHT_HEAL_PCT) / 100);
  return { character: { ...character, currentHealth: healed }, window };
}

/** The no-RPG player's gear: each new item goes into a free slot, or over a random worn one. Nothing is kept unworn. */
export function wearAtRandom(character: Character, newIds: string[], rng: Rng): Character {
  const slots = maxEquipSlots(character);
  let worn = [...character.equippedItemIds];
  for (const id of newIds) {
    if (worn.length < slots) worn = [...worn, id];
    else {
      const slot = Math.floor(rng() * worn.length);
      worn = worn.map((w, i) => (i === slot ? id : w));
    }
  }
  return clampHealthToMax({ ...character, ownedItemIds: worn, equippedItemIds: worn, doubledItemIds: character.doubledItemIds?.filter((id) => worn.includes(id)) });
}
