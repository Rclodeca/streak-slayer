// Small shared (module-scope) record of the last check-off, so the menu's
// Undo can take it back — same singleton reasoning as useBossSkillCard:
// useCombatActions records it and AppMenu offers it.
//
// The record holds the stores' state from just before the check and just
// after it. Undo is offered only while the stores still hold that "after"
// state, so anything since (another check, an equip, a rollover) takes the
// offer away; only on the day of the check; and once a day
// (Character.undoDayKey), so undoing and re-checking can't reroll crits.
// useCombatActions only offers a plain blow: a check that levels up, kills
// the boss, or brings the hero down is never offered.
//
// Kept in memory only: a reload drops the offer.

import { shallowRef, toRaw } from 'vue';
import { dailyPeriodKey } from '../game-engine';
import type { Boss, Character, Habit } from '../game-engine';
import type { ActivityLogEntry } from '../store/activityLogStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useBossSkillCard } from './useBossSkillCard';

/** The state a check-off can change. The stores replace these objects rather than editing them, so holding them is safe. */
export interface CheckSnapshot {
  character: Character;
  boss: Boss;
  habits: Habit[];
  log: ActivityLogEntry[];
}

const offered = shallowRef<{ before: CheckSnapshot; after: CheckSnapshot; dayKey: string } | null>(null);

function sameState(a: CheckSnapshot, b: CheckSnapshot): boolean {
  return (
    a.character === b.character &&
    a.boss === b.boss &&
    a.log === b.log &&
    a.habits.length === b.habits.length &&
    a.habits.every((habit, i) => habit === b.habits[i])
  );
}

export function useUndoCheck() {
  const characterStore = useCharacterStore();
  const bossStore = useBossStore();
  const habitStore = useHabitStore();
  const activityLogStore = useActivityLogStore();
  const debugClockStore = useDebugClockStore();
  const { clear: clearBossSkills } = useBossSkillCard();

  function snapshot(): CheckSnapshot {
    return {
      character: toRaw(characterStore.character),
      boss: toRaw(bossStore.boss),
      habits: [...toRaw(habitStore.habits)],
      log: toRaw(activityLogStore.entries),
    };
  }

  /** Offers an undo back to `before`, the snapshot taken just before the check that just resolved. */
  function offer(before: CheckSnapshot): void {
    offered.value = { before, after: snapshot(), dayKey: dailyPeriodKey(debugClockStore.now()) };
  }

  function forget(): void {
    offered.value = null;
  }

  // A plain function rather than a computed: "today" comes from the clock,
  // which isn't reactive, so a cached answer could outlive its day.
  function canUndo(): boolean {
    const record = offered.value;
    if (!record) return false;
    const today = dailyPeriodKey(debugClockStore.now());
    return record.dayKey === today && characterStore.character.undoDayKey !== today && sameState(record.after, snapshot());
  }

  /** Puts the stores back as they were before the last check, and closes any boss skill card it set off. */
  function undo(): void {
    const record = offered.value;
    if (!record || !canUndo()) return;
    characterStore.setCharacter({ ...record.before.character, undoDayKey: record.dayKey });
    bossStore.setBoss(record.before.boss);
    habitStore.setHabits([...record.before.habits]);
    activityLogStore.setEntries(record.before.log);
    clearBossSkills();
    offered.value = null;
  }

  return { snapshot, offer, forget, canUndo, undo };
}
