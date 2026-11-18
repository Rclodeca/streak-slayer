// The perfect week (game-engine/perfectWeek.ts) run against the stores. The
// rollover settles it at once when no good skill's miss is waiting in the
// missed-skills popup; otherwise it holds the week, and the popup's OK settles
// it with only the misses that stand, so "I actually did this" counts.
// Module-scoped like useMissedSkillsGate: the rollover holds, the gate releases.

import { ref } from 'vue';
import type { MissSpan } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useHabitStore } from '../store/habitStore';

const heldWeekKey = ref<string | null>(null);

export function usePerfectWeek() {
  const accountStore = useAccountStore();
  const activityLogStore = useActivityLogStore();
  const habitStore = useHabitStore();

  /** Settles the perfect week in `nowWeekKey` with the misses that stand; logs and returns the gems paid. */
  function settle(nowWeekKey: string, misses: MissSpan[]): number {
    const gems = accountStore.settlePerfectWeek(nowWeekKey, misses, habitStore.habits);
    if (gems > 0) activityLogStore.addEntry({ kind: 'gems', amount: gems, reason: 'perfect-week' });
    return gems;
  }

  /** Waits to settle `nowWeekKey` until the missed-skills popup is answered. */
  function hold(nowWeekKey: string): void {
    heldWeekKey.value = nowWeekKey;
  }

  /** Settles a held week with the misses that stood; a no-op with none held. */
  function release(misses: MissSpan[]): void {
    const weekKey = heldWeekKey.value;
    heldWeekKey.value = null;
    if (weekKey !== null) settle(weekKey, misses);
  }

  return { settle, hold, release };
}
