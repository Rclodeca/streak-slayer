// Thin Pinia wrapper around the character slice of game state. Every action
// here delegates straight into `game-engine` and assigns the result back —
// no formulas or randomization live in this file.

import { defineStore } from 'pinia';
import {
  addExpAndResolveLevelUps,
  ITEM_CATALOG,
  applyDamagePoolRebalance,
  applyHealBaseCut,
  applyHealBoost,
  applyHealingRebalance,
  applyHealthGrowthBump,
  clampHealthToMax,
  discardUnequippedItems,
  discardUnknownItems,
  completeHabit,
  createCharacter,
  createRng,
  maxEquipSlots,
  migrateCharacter,
  missHabit,
  nameCharacter,
  resolvePlayerDeathIfDead,
  recordRelicEarned,
  rollItemDrops,
  unlockQuests,
  unlockShopGates,
  unlockTalents,
} from '../game-engine';
import type { Boss, Character, Habit, ItemDef, Rng } from '../game-engine';

export const useCharacterStore = defineStore('character', {
  state: () => ({
    character: createCharacter(createRng()) as Character,
  }),
  actions: {
    /** Hydrates from a save slice (migrating in any stats added since it was written), or bootstraps a fresh character: a warrior, the new-hero screen's first offer. */
    initFromSave(saved: Character | null, rng: Rng) {
      this.character = saved
        ? clampHealthToMax(discardUnequippedItems(discardUnknownItems(applyHealBaseCut(applyHealthGrowthBump(applyHealBoost(applyHealingRebalance(applyDamagePoolRebalance(migrateCharacter(saved, rng)))))))))
        : createCharacter(rng, 'warrior');
    },

    /** Rolls one boss-kill's worth of item drops, adds them to owned items, and returns them. */
    grantItemDrops(rng: Rng, maxCount?: number): ItemDef[] {
      const dropped = rollItemDrops(this.character, rng, maxCount);
      this.character = { ...this.character, ownedItemIds: [...this.character.ownedItemIds, ...dropped.map((item) => item.id)] };
      return dropped;
    },

    /** Adds one specific catalog item to owned items (a side-quest reward) and returns it; null if unknown or already owned. A relic is also recorded as earned for the run. */
    grantItem(itemId: string): ItemDef | null {
      const item = ITEM_CATALOG.find((i) => i.id === itemId);
      if (!item || this.character.ownedItemIds.includes(itemId)) return null;
      this.character = recordRelicEarned({ ...this.character, ownedItemIds: [...this.character.ownedItemIds, itemId] }, itemId);
      return item;
    },

    /** Replaces the character wholesale, e.g. after combat resolution elsewhere. */
    setCharacter(character: Character) {
      this.character = character;
    },

    /** Names the hero from the new-hero screen (see nameCharacter for trimming and the blank default). */
    setName(name: string) {
      this.character = nameCharacter(this.character, name);
    },

    /** Opens the quests section for good (the "Quests unlocked" popup's Onward). */
    unlockQuests() {
      this.character = unlockQuests(this.character);
    },

    /** Opens the Talents tab for good (the "Talents unlocked" popup's Onward). */
    unlockTalents() {
      this.character = unlockTalents(this.character);
    },

    /** Opens for good every Shop gate the level has reached (the level-up popup's Onward). */
    unlockShopGates() {
      this.character = unlockShopGates(this.character);
    },

    /** Equips an owned item into an empty slot. No-op if not owned, already equipped, or all slots are full (see maxEquipSlots). */
    equipItem(itemId: string) {
      const { ownedItemIds, equippedItemIds } = this.character;
      if (!ownedItemIds.includes(itemId)) return;
      if (equippedItemIds.includes(itemId)) return;
      if (equippedItemIds.length >= maxEquipSlots(this.character)) return;
      this.character = clampHealthToMax({ ...this.character, equippedItemIds: [...equippedItemIds, itemId] });
    },

    /** Discards an item for good — it leaves the character and returns to the drop pool. No-op if not owned. */
    discardItem(itemId: string) {
      const { ownedItemIds, equippedItemIds } = this.character;
      if (!ownedItemIds.includes(itemId)) return;
      this.character = clampHealthToMax({
        ...this.character,
        ownedItemIds: ownedItemIds.filter((id) => id !== itemId),
        equippedItemIds: equippedItemIds.filter((id) => id !== itemId),
        doubledItemIds: this.character.doubledItemIds?.filter((id) => id !== itemId),
      });
    },

    /** Grants EXP and resolves any resulting level-ups. Returns levels gained. */
    addExpAndResolveLevelUps(expGained: number): number {
      const { character, levelsGained } = addExpAndResolveLevelUps(this.character, expGained);
      this.character = character;
      return levelsGained;
    },

    /**
     * Character-side effect of completing a habit (healing habits update
     * `currentHealth`; damage habits leave the character untouched). Returns
     * the full combat result so callers can apply the boss/habit sides too.
     */
    completeHabit(habit: Habit, allHabits: Habit[], boss: Boss, currentDayKey: string, rng: Rng) {
      const result = completeHabit(this.character, habit, allHabits, boss, currentDayKey, rng);
      this.character = result.character;
      return result;
    },

    /** Character-side effect of missing a habit: applies boss-attack damage. */
    missHabit(habit: Habit, boss: Boss, currentDayKey: string, rng: Rng) {
      const result = missHabit(this.character, habit, boss, currentDayKey, rng);
      this.character = result.character;
      return result;
    },

    /** No-op unless dead; otherwise takes the death setback (see resolvePlayerDeathIfDead). */
    resolvePlayerDeathIfDead(boss: Boss, rng: Rng) {
      const result = resolvePlayerDeathIfDead(this.character, boss, rng);
      this.character = result.character;
      return result;
    },
  },
});
