// Small shared (module-scope) record of the level-up popup's news — same
// singleton reasoning as useQuestCompleteQueue: useCombatActions records a
// level-up as it lands and LevelUpPopup (mounted once in AppShell) shows it.
// Levels gained before the popup is dismissed fold into the one already
// waiting, so one popup covers them all. Purely presentational; the levels,
// heal and Special/Ult are already granted.

import { ref } from 'vue';

export interface LevelUpNews {
  fromLevel: number;
  toLevel: number;
  healed: number;
  // The skills just handed the Special or the Ult, by name.
  special?: string;
  ult?: string;
}

const current = ref<LevelUpNews | null>(null);

export function useLevelUp() {
  function record(fromLevel: number, toLevel: number, healed: number) {
    const held = current.value;
    current.value = held
      ? { ...held, fromLevel: Math.min(held.fromLevel, fromLevel), toLevel: Math.max(held.toLevel, toLevel), healed: held.healed + healed }
      : { fromLevel, toLevel, healed };
  }

  /** Adds a Special or Ult handed out to the waiting popup; a no-op when none is waiting (a new skill took one later). */
  function noteReward(kind: 'special' | 'ult', habitName: string) {
    if (current.value) current.value = { ...current.value, [kind]: habitName };
  }

  function dismiss() {
    current.value = null;
  }

  return { current, record, noteReward, dismiss };
}
