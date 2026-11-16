// The gold shop's services run against the stores (rules in
// game-engine/services.ts): item slots, a skill's reroll, Overdrive and
// enchanting a worn item, one of them on offer each 3-day turn. Each buy pays
// at once, logs what it cost and returns false (nothing spent) when it can't
// go through. A buy then shows what it did: a reroll or an enchant, whose
// result is the news, in a popup (`done`, and the reveal, which also counts
// for the Enchanted trial); a slot or Overdrive, done just as asked, in a
// toast at the foot of the screen.

import { computed, ref } from 'vue';
import {
  buyEnchant as buyEnchantRule,
  buyOverdrive as buyOverdriveRule,
  buyReroll as buyRerollRule,
  buySlot as buySlotRule,
  createRng,
  dailyPeriodKey,
  nextService,
  serviceState,
  serviceTurn,
  syncServiceTurn,
  turnDaysLeft,
} from '../game-engine';
import type { DamageType, ItemDef, ServiceId } from '../game-engine';
import { TUNING } from '../game-engine/constants/tuning';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useCombatActions } from './useCombatActions';
import { useToast } from './useToast';

const rng = createRng();
// The item just enchanted, shown on its own screen until the player continues.
// Module-scoped because the reveal is mounted once, like the item drop queue.
const revealed = ref<ItemDef | null>(null);

/** What a reroll just did, for its popup: the skill's old and new damage type. */
export type ServiceDone = { id: 'reroll'; habitName: string; from: DamageType; to: DamageType };
const done = ref<ServiceDone | null>(null);

// A second slot buy within this long of the last is a double tap, not a choice:
// the next step costs more but can still be afforded, so nothing else stops it.
const SLOT_GUARD_MS = 500;
let lastSlotAt = -Infinity;

export function useServices() {
  const characterStore = useCharacterStore();
  const habitStore = useHabitStore();
  const bossStore = useBossStore();
  const activityLogStore = useActivityLogStore();
  const debugClockStore = useDebugClockStore();
  const { reportChallenge } = useCombatActions();
  const toast = useToast();

  /** Today's key, read fresh. `dayTick` makes a computed reading it follow a real day turnover. */
  function today(): string {
    void debugClockStore.dayTick;
    return dailyPeriodKey(debugClockStore.now());
  }
  const todayKey = computed(today);

  /** The service on offer today, how many days it has left, and the one whose turn is next. */
  const turn = computed(() => serviceTurn(characterStore.character, habitStore.habits, todayKey.value));
  const daysLeft = computed(() => turnDaysLeft(turn.value, todayKey.value));
  const next = computed(() => nextService(characterStore.character, habitStore.habits, turn.value.id));

  /** Puts today's turn on the character if it isn't there yet (first open, a turn running out, a new run). */
  function ensureTurn(): void {
    const synced = syncServiceTurn(characterStore.character, habitStore.habits, today());
    if (synced !== characterStore.character) characterStore.setCharacter(synced);
  }

  /** A service's card: price, status and what sets the price. */
  function state(id: ServiceId) {
    return serviceState(characterStore.character, habitStore.habits, id, bossStore.boss.index);
  }

  /** The gold the next buy of `id` costs, read before the buy changes it. */
  const priceOf = (id: ServiceId) => state(id).price;

  function buyReroll(habitId: string): boolean {
    const price = priceOf('reroll');
    const before = habitStore.habits.find((habit) => habit.id === habitId)?.damageType;
    const result = buyRerollRule(characterStore.character, habitStore.habits, habitId, bossStore.boss.index, rng);
    if (!result || !before) return false;
    characterStore.setCharacter(result.character);
    habitStore.setHabits(result.habits);
    activityLogStore.addEntry({ kind: 'skill-rerolled', habitName: result.habit.name, damageType: result.habit.damageType, gold: price });
    done.value = { id: 'reroll', habitName: result.habit.name, from: before, to: result.habit.damageType };
    return true;
  }

  function buyOverdrive(habitId: string): boolean {
    const price = priceOf('overdrive');
    const result = buyOverdriveRule(characterStore.character, habitStore.habits, habitId, bossStore.boss.index);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    habitStore.setHabits(result.habits);
    activityLogStore.addEntry({ kind: 'overdrive-granted', habitName: result.habit.name, gold: price });
    toast.show({ art: 'services/overdrive', title: 'Overdrive', text: `${result.habit.name} · ${TUNING.OVERDRIVE_MAX_EXTRA_USES} extra uses`, tone: 'var(--brass-solid)' });
    return true;
  }

  function buyEnchant(itemId: string): boolean {
    const price = priceOf('enchant');
    const result = buyEnchantRule(characterStore.character, itemId, bossStore.boss.index);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'item-doubled', itemName: result.item.name, gold: price });
    revealed.value = result.item;
    reportChallenge({ type: 'enchanted' });
    return true;
  }

  function buySlot(): boolean {
    const since = Date.now() - lastSlotAt;
    if (since >= 0 && since < SLOT_GUARD_MS) return false;
    const price = priceOf('slot');
    const result = buySlotRule(characterStore.character, bossStore.boss.index);
    if (!result) return false;
    lastSlotAt = Date.now();
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'item-slots-gained', slots: result.slots, gold: price });
    toast.show({ art: 'services/slot', title: 'Item slots', text: `${result.slots - 1} → ${result.slots} slots`, tone: 'var(--brass-solid)' });
    return true;
  }

  function dismissReveal() {
    revealed.value = null;
  }

  function dismissDone() {
    done.value = null;
  }

  return { todayKey, turn, daysLeft, next, ensureTurn, state, buyReroll, buyOverdrive, buyEnchant, buySlot, revealed, dismissReveal, done, dismissDone };
}
