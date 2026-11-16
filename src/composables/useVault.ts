// The gem services run against the stores (rules in game-engine/vault.ts and
// freeze.ts): the Gold Pouch and a skill's streak freeze, bought with the
// account's gems. Each buy says what it did in a toast: the gold the pouch
// paid, or which skill rests and when.

import { computed } from 'vue';
import { addDaysToDayKey, buyFreeze as buyFreezeRule, buyPouch as buyPouchRule, dailyPeriodKey, formatDayKey, pouchState } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useToast } from './useToast';

export function useVault() {
  const characterStore = useCharacterStore();
  const accountStore = useAccountStore();
  const bossStore = useBossStore();
  const debugClockStore = useDebugClockStore();
  const activityLogStore = useActivityLogStore();
  const habitStore = useHabitStore();
  const toast = useToast();

  /** Today's key, read fresh. `dayTick` makes a computed reading it follow a real day turnover. */
  function today(): string {
    void debugClockStore.dayTick;
    return dailyPeriodKey(debugClockStore.now());
  }
  const todayKey = computed(today);
  const pouch = computed(() => pouchState(characterStore.character, accountStore.account.gems, bossStore.boss.index, todayKey.value));

  /** Buys the Gold Pouch. False (nothing spent) unless its row reads `buy`. */
  function buyPouch(): boolean {
    const result = buyPouchRule(characterStore.character, accountStore.account.gems, bossStore.boss.index, today());
    if (!result || !accountStore.spendGems(result.gemsSpent)) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'vault-bought', name: 'Gold Pouch', gems: result.gemsSpent, gold: result.gold });
    toast.show({ art: 'services/pouch', title: 'Gold Pouch', text: `+${result.gold.toLocaleString('en-US')} gold`, tone: 'var(--icon-gold)' });
    return true;
  }

  /** Freezes one skill for `count` periods from `fromDayKey` (see buyFreeze in freeze.ts). False (nothing spent) if it can't be bought or the skill is gone. */
  function buyFreeze(habitId: string, fromDayKey: string, count: number): boolean {
    const habit = habitStore.habits.find((h) => h.id === habitId);
    const result = habit && buyFreezeRule(habit, today(), fromDayKey, count, accountStore.account.gems);
    if (!habit || !result || !accountStore.spendGems(result.gemsSpent)) return false;
    habitStore.updateHabit(result.habit);
    activityLogStore.addEntry({ kind: 'freeze-bought', habitName: habit.name, fromDayKey, count, period: habit.period, gems: result.gemsSpent });
    const lastKey = addDaysToDayKey(fromDayKey, (habit.period === 'weekly' ? 7 : 1) * count - 1);
    const span = lastKey === fromDayKey ? formatDayKey(fromDayKey) : `${formatDayKey(fromDayKey)} – ${formatDayKey(lastKey)}`;
    toast.show({ art: 'services/freeze', title: 'Streak Freeze', text: `${habit.name} · ${span}`, tone: 'var(--icon-arcane)' });
    return true;
  }

  return { todayKey, pouch, buyPouch, buyFreeze };
}
