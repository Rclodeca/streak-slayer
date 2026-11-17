import { computed } from 'vue';
import { dailyPeriodKey, serviceTurn } from '../game-engine';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useHabitStore } from '../store/habitStore';
import { useShopSeenStore } from '../store/shopSeenStore';
import type { ShopSide } from '../store/tabStore';

/**
 * Which sides of the Shop have something the player hasn't looked at: Items
 * when the day has turned since they last saw the stock, Services when the
 * service has rotated since they last saw it, and Looks once, for a new player.
 * `any` is what the Shop tab wears. Opening a side clears it (`see`).
 */
export function useShopNews() {
  const characterStore = useCharacterStore();
  const habitStore = useHabitStore();
  const debugClockStore = useDebugClockStore();
  const seenStore = useShopSeenStore();

  /** Today's key; `dayTick` makes it follow a real day turnover. */
  const todayKey = computed(() => {
    void debugClockStore.dayTick;
    return dailyPeriodKey(debugClockStore.now());
  });
  /** The day the service on offer began its turn, whether or not it has been saved to the character yet. */
  const turnStart = computed(() => serviceTurn(characterStore.character, habitStore.habits, todayKey.value).startDayKey);

  const items = computed(() => seenStore.seen.itemsDay !== todayKey.value);
  const services = computed(() => seenStore.seen.servicesStart !== turnStart.value);
  const looks = computed(() => !seenStore.seen.looks);
  const any = computed(() => items.value || services.value || looks.value);

  /** Whether `side` has something new. */
  function isNew(side: ShopSide): boolean {
    return { items: items, services: services, vault: looks }[side].value;
  }

  /** The player is looking at `side`: its dot clears. */
  function see(side: ShopSide): void {
    if (side === 'items') seenStore.seeItems(todayKey.value);
    else if (side === 'services') seenStore.seeServices(turnStart.value);
    else seenStore.seeLooks();
  }

  return { todayKey, turnStart, isNew, any, see };
}
