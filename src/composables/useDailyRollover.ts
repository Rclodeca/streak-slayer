// Composable that walks every habit once per period-boundary crossing and
// queues an outcome (via `useMissedSkillsGate`) for any habit that wasn't
// completed in the period immediately preceding the current one. Intended
// to run once on app mount (see `App.vue`) — not on a timer.
//
// "Not completed" means opposite things for opposite habit kinds: for a
// good habit it's a miss (`queueMiss` — penalty); for a bad habit it means
// the player avoided it, which is the win condition (`queueReward`). See
// `Habit.isBad` in types.ts and `useCombatActions` for the full reasoning.
//
// Queuing, not applying: this only detects and records outcomes. The actual
// damage/healing and `lastCheckedPeriodKey` stamp are deferred to
// `useMissedSkillsGate().acknowledge()`, once the player has seen the
// popup and clicked OK — see that composable for why.
//
// MVP scope only: this detects "was the most recently completed period
// missed", not a backlog of every period missed while the app was closed.
// If the app was closed across multiple period boundaries, only the single
// immediately-preceding period is checked; earlier gaps are not backfilled.
//
// A set-day habit is resolved against its most recent due day since it was
// last checked rather than literally yesterday, so a missed Monday still
// counts when the app first opens on Wednesday after a Tuesday rest day. Days
// a streak freeze covered are passed over the same way, for every habit. If
// it only rested since, there's nothing to resolve and it's just stamped.

import { applyDailyRegen, dailyPeriodKey, daysBetweenDayKeys, frozenDays, isDueOn, periodKeyFor } from '../game-engine';
import type { Habit } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useCharacterStore } from '../store/characterStore';
import { useHabitStore } from '../store/habitStore';
import { useQuestStore } from '../store/questStore';
import { useCombatActions } from './useCombatActions';
import { useMissedSkillsGate } from './useMissedSkillsGate';
import { useQuestMissGate } from './useQuestMissGate';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How far back a daily's rollover looks for its last due day: a week of rest days plus a week-long freeze. */
const LOOK_BACK_DAYS = 14;

/**
 * The period key a habit's rollover resolves: its most recent period that was
 * due (not a set-day rest day, not covered by a streak freeze in `frozen`) and
 * no earlier than `lastCheckedPeriodKey`. For a plain daily that's yesterday,
 * for a weekly last week, unless they rested. Looking past the rest is what
 * keeps a freeze from hiding a real miss on the day before it when the app
 * stayed closed through it. Undefined when it only rested since.
 */
function periodKeyToResolve(habit: Habit, now: Date, frozen: readonly string[]): string | undefined {
  if (habit.period === 'weekly') {
    for (let back = 1; back <= 2; back++) {
      const week = new Date(now.getTime() - back * 7 * MS_PER_DAY);
      const weekKey = periodKeyFor('weekly', week);
      // Week keys (YYYY-Www) sort as text.
      if (habit.lastCheckedPeriodKey && weekKey < habit.lastCheckedPeriodKey) return undefined;
      if (isDueOn(habit, week, frozen)) return weekKey;
    }
    return undefined;
  }
  for (let back = 1; back <= LOOK_BACK_DAYS; back++) {
    const day = new Date(now.getTime() - back * MS_PER_DAY);
    const dayKey = dailyPeriodKey(day);
    if (habit.lastCheckedPeriodKey && daysBetweenDayKeys(habit.lastCheckedPeriodKey, dayKey) < 0) return undefined;
    if (isDueOn(habit, day, frozen)) return dayKey;
  }
  return undefined;
}

/**
 * Runs the daily/weekly rollover check against every habit's current
 * state. For each habit whose period has advanced since it was last
 * checked: if it wasn't completed in the immediately-preceding period,
 * queues a miss (leaving `lastCheckedPeriodKey` untouched until that miss
 * is acknowledged); otherwise stamps `lastCheckedPeriodKey` to the current
 * period key immediately, since there's nothing to gate on.
 */
export function useDailyRollover(now: Date = new Date()): void {
  const habitStore = useHabitStore();
  const { queueMiss, queueReward, hasPending } = useMissedSkillsGate();
  const questStore = useQuestStore();
  const { queueMiss: queueQuestMiss, hasPending: questMissesPending } = useQuestMissGate();

  // Days a streak freeze covers rest every skill: no miss, no avoid reward.
  const frozen = frozenDays(useAccountStore().account);

  for (const habit of habitStore.habits) {
    const currentPeriodKey = periodKeyFor(habit.period, now);
    if (habit.lastCheckedPeriodKey === currentPeriodKey) continue; // no boundary crossed

    const keyToResolve = periodKeyToResolve(habit, now, frozen);
    if (keyToResolve !== undefined && habit.lastCompletedPeriodKey !== keyToResolve) {
      // Not completed in the preceding period: a miss for a good habit, but
      // the win condition (avoided) for a bad one.
      if (habit.isBad) {
        queueReward(habit, currentPeriodKey);
      } else {
        queueMiss(habit, currentPeriodKey);
      }
      continue; // stamping deferred until the outcome is acknowledged
    }

    habitStore.updateHabit({ ...habit, lastCheckedPeriodKey: currentPeriodKey });
  }

  const todayKey = dailyPeriodKey(now);
  // Ember Heart's once-a-day heal (a no-op without it, or if it already ran today).
  const characterStore = useCharacterStore();
  const regen = applyDailyRegen(characterStore.character, todayKey);
  if (regen.character !== characterStore.character) {
    characterStore.setCharacter(regen.character);
    if (regen.healed > 0) useActivityLogStore().addEntry({ kind: 'item-heal', itemName: 'Ember Heart', amount: regen.healed });
  }

  // Challenges look back at the day that just ended, before a quest finished
  // that day leaves the list. Safe to repeat: a day is only counted once. A
  // frozen day isn't looked at: it neither counts towards a trial nor breaks one.
  const combat = useCombatActions();
  const endedDate = new Date(now.getTime() - MS_PER_DAY);
  if (!frozen.includes(dailyPeriodKey(endedDate))) {
    combat.reportChallenge({ type: 'day-end', endedDate, habits: habitStore.habits, quests: questStore.quests, frozenDayKeys: frozen }, todayKey);
  }

  // A quest checked off on an earlier day leaves with the turn of the day; one already overdue took its hit.
  questStore.clearDone(todayKey);
  for (const quest of questStore.quests) {
    if (!quest.overdue && !quest.doneDayKey && daysBetweenDayKeys(quest.dueDateKey, todayKey) > 0) {
      queueQuestMiss(quest);
    }
  }

  // A due Doom lands after the day's misses resolve: now if nothing is
  // queued, otherwise when the last popup's OK runs them (see
  // useMissedSkillsGate/useQuestMissGate acknowledge).
  if (!hasPending.value && !questMissesPending.value) combat.landDoom(todayKey);
}
