// Thin Pinia wrapper around the quests slice of game state. No formulas or
// randomization live here — everything delegates into `game-engine`.

import { defineStore } from 'pinia';
import { createQuest, migrateQuest } from '../game-engine';
import type { Difficulty, Quest, QuestKind } from '../game-engine';

export const useQuestStore = defineStore('quest', {
  state: () => ({
    quests: [] as Quest[],
  }),
  actions: {
    /** Hydrates from a save slice (migrating quests saved before quests v2), or bootstraps an empty quest list. */
    initFromSave(saved: Quest[] | null) {
      this.quests = (saved ?? []).map(migrateQuest);
    },

    /** Creates a new quest via the engine and adds it to the list. */
    addQuest(description: string, difficulty: Difficulty, dueDateKey: string, kind: QuestKind = 'regular', rewardItemId?: string): Quest {
      const quest = createQuest(description, difficulty, dueDateKey, kind, rewardItemId);
      this.quests.push(quest);
      return quest;
    },

    /** Checks a quest off for `dayKey`: it stays in the list, checked, until clearDone runs on a later day. */
    markDone(id: string, dayKey: string) {
      this.quests = this.quests.map((quest) => (quest.id === id ? { ...quest, doneDayKey: dayKey } : quest));
    },

    /** Flags a quest overdue once its miss has landed; a side quest forfeits its relic, which returns to the pool. */
    markOverdue(id: string) {
      this.quests = this.quests.map((quest) => {
        if (quest.id !== id) return quest;
        const overdue: Quest = { ...quest, overdue: true };
        delete overdue.rewardItemId;
        return overdue;
      });
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
