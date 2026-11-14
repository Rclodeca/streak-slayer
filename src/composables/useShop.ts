// The gold shop run against the stores (rules in game-engine/shop.ts): draws
// today's stock, buys wares and tonics with the character's gold, and restocks.
// A bought item goes through the drop popup like a find, so it's equipped,
// swapped in or dropped at once (there's no inventory). Buying an epic isn't a
// find, so it doesn't report the Epic find trial.

import { computed } from 'vue';
import {
  buyTonic as buyTonicRule,
  buyWare,
  createRng,
  dailyPeriodKey,
  maxEquipSlots,
  restockFee,
  restockShop,
  stockShop,
  TONIC_DEFS,
  tonicState,
} from '../game-engine';
import type { ShopStock, TonicId } from '../game-engine';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useItemDropQueue } from './useItemDropQueue';

const rng = createRng();

export function useShop() {
  const characterStore = useCharacterStore();
  const bossStore = useBossStore();
  const debugClockStore = useDebugClockStore();
  const activityLogStore = useActivityLogStore();
  const { enqueueDrops } = useItemDropQueue();

  const todayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
  const stock = computed<ShopStock | null>(() => characterStore.character.shop ?? null);
  const restockPrice = computed(() => restockFee(stock.value?.restocks ?? 0, bossStore.boss.index));
  const slotsFull = computed(() => characterStore.character.equippedItemIds.length >= maxEquipSlots(characterStore.character));

  /** Draws today's stock if the character has none for today (first open, a new day, a new run). */
  function ensureStock(): void {
    const stocked = stockShop(characterStore.character, bossStore.boss.index, todayKey.value, rng);
    if (stocked !== characterStore.character) characterStore.setCharacter(stocked);
  }

  /** Buys a stocked item and hands it to the drop popup. False (nothing spent) if it can't be bought. */
  function buy(itemId: string): boolean {
    const price = [stock.value?.featured, ...(stock.value?.wares ?? [])].find((w) => w?.itemId === itemId)?.price ?? 0;
    const result = buyWare(characterStore.character, itemId);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    enqueueDrops([result.item], undefined, true);
    activityLogStore.addEntry({ kind: 'shop-bought', name: result.item.name, gold: price });
    return true;
  }

  /** Pays the restock fee and redraws the stock. False if there's no stock or too little gold. */
  function restock(): boolean {
    const result = restockShop(characterStore.character, bossStore.boss.index, rng);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'shop-restocked', gold: result.fee });
    return true;
  }

  /** A tonic's row: price, status and days left today. */
  function tonic(id: TonicId) {
    return tonicState(characterStore.character, id, bossStore.boss.index, todayKey.value);
  }

  /** Buys a tonic and uses it at once. False (nothing spent) unless its row reads `buy`. */
  function buyTonic(id: TonicId): boolean {
    const { price } = tonic(id);
    const result = buyTonicRule(characterStore.character, id, bossStore.boss.index, todayKey.value);
    if (!result) return false;
    characterStore.setCharacter(result.character);
    const name = TONIC_DEFS.find((def) => def.id === id)?.name ?? id;
    activityLogStore.addEntry({ kind: 'shop-bought', name, gold: price });
    if (result.healed) activityLogStore.addEntry({ kind: 'event-heal', amount: result.healed });
    return true;
  }

  return { stock, todayKey, ensureStock, buy, restock, restockPrice, buyTonic, tonic, slotsFull };
}
