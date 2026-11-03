// Thin Pinia wrapper around the quests slice of game state. No formulas or
// randomization live here — everything delegates into `game-engine`.

import { defineStore } from 'pinia';
import { createQuest, migrateQuest } from '../game-engine';
import type { Difficulty, Quest } from '../game-engine';

export const useQuestStore = defineStore('quest', {
  state: () => ({
    quests: [] as Quest[],
  }),
  actions: {
    /** Hydrates from a save slice (migrating older quests: v1 shape, old side quests), or bootstraps an empty quest list. */
    initFromSave(saved: Quest[] | null) {
      this.quests = (saved ?? []).map(migrateQuest);
    },

    /** Creates a new quest via the engine and adds it to the list. */
    addQuest(description: string, difficulty: Difficulty, dueDateKey: string, createdDayKey?: string): Quest {
      const quest = createQuest(description, difficulty, dueDateKey, createdDayKey);
      this.quests.push(quest);
      return quest;
    },

    /** Checks a quest off for `dayKey`: it stays in the list, checked, until clearDone runs on a later day. */
    markDone(id: string, dayKey: string) {
      this.quests = this.quests.map((quest) => (quest.id === id ? { ...quest, doneDayKey: dayKey } : quest));
    },

    /** Flags a quest overdue once its miss has landed. */
    markOverdue(id: string) {
      this.quests = this.quests.map((quest) => (quest.id === id ? { ...quest, overdue: true } : quest));
    },

    /** Removes every quest checked off on a day before `todayKey`. */
    clearDone(todayKey: string) {
      this.quests = this.quests.filter((quest) => quest.doneDayKey === undefined || quest.doneDayKey >= todayKey);
    },

    /** Removes a quest by id, e.g. once it's been completed or failed. */
    removeQuest(id: string) {
      this.quests = this.quests.filter((quest) => quest.id !== id);
    },
  },
});
