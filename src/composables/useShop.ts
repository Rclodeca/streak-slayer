// The shop run against the stores (rules in game-engine/shop.ts): draws
// today's stock, buys wares (with the character's gold, or the account's gems
// for a gem ware) and potions, and restocks.
// An item is offered in the drop popup first and paid for there: on Buy with
// a slot open, or on Replace with every slot full (there's no inventory).
// Turning it down costs nothing and leaves it in stock. Buying an epic isn't
// a find, so it doesn't report the Epic find trial. A potion bought says
// what it did in a toast at the foot of the screen, not a popup.

import { computed } from 'vue';
import {
  buyTonic as buyTonicRule,
  buyWare,
  createRng,
  dailyPeriodKey,
  ITEM_CATALOG,
  restockFee,
  restockShop,
  stockShop,
  TONIC_DEFS,
  tonicState,
  wareState,
} from '../game-engine';
import type { ShopStock, TonicId } from '../game-engine';
import { useAccountStore } from '../store/accountStore';
import { useActivityLogStore } from '../store/activityLogStore';
import { useBossStore } from '../store/bossStore';
import { useCharacterStore } from '../store/characterStore';
import { useDebugClockStore } from '../store/debugClockStore';
import { useItemDropQueue } from './useItemDropQueue';
import { useToast } from './useToast';
import { TUNING } from '../game-engine/constants/tuning';

const rng = createRng();

const pct = (bonus: number) => Math.round(bonus * 100);
/** What each potion just did, for its toast: the HP healed, or the boost and its days. */
const TONIC_DONE: Record<TonicId, (healed: number) => string> = {
  draught: (healed) => `+${healed.toLocaleString('en-US')} HP`,
  crit: () => `+${pct(TUNING.CRIT_BOOST_BONUS)}% crit · ${TUNING.CRIT_BOOST_DAYS} days`,
  heal: () => `+${pct(TUNING.HEAL_BOOST_BONUS)}% healing · ${TUNING.HEAL_BOOST_DAYS} days`,
  exp: () => `+${pct(TUNING.EXP_BOOST_BONUS)}% EXP · ${TUNING.EXP_BOOST_DAYS} days`,
};
const TONIC_TONES: Record<TonicId, string> = { draught: 'var(--dmg-healing)', crit: 'var(--icon-crit)', heal: 'var(--dmg-healing)', exp: 'var(--icon-exp)' };

// A second Restock within this long of the last is a double tap, not a choice:
// nothing else stops it, since a restock is never sold out.
const RESTOCK_GUARD_MS = 500;
let lastRestockAt = -Infinity;

export function useShop() {
  const characterStore = useCharacterStore();
  const accountStore = useAccountStore();
  const bossStore = useBossStore();
  const debugClockStore = useDebugClockStore();
  const activityLogStore = useActivityLogStore();
  const { offerItem } = useItemDropQueue();
  const toast = useToast();

  /** Today's key, read fresh. `dayTick` makes a computed reading it follow a real day turnover. */
  function today(): string {
    void debugClockStore.dayTick;
    return dailyPeriodKey(debugClockStore.now());
  }
  const todayKey = computed(today);
  const stock = computed<ShopStock | null>(() => characterStore.character.shop ?? null);
  const restockPrice = computed(() => restockFee(stock.value?.restocks ?? 0, bossStore.boss.index));

  /** Draws today's stock if the character has none for today (first open, a new day, a new run). */
  function ensureStock(): void {
    const stocked = stockShop(characterStore.character, bossStore.boss.index, today(), rng);
    if (stocked !== characterStore.character) characterStore.setCharacter(stocked);
  }

  /** Offers a stocked item in the drop popup, where it's paid for. False (nothing offered) if it can't be bought. */
  function buy(itemId: string): boolean {
    const ware = [stock.value?.featured, ...(stock.value?.wares ?? [])].find((w) => w?.itemId === itemId);
    const item = ITEM_CATALOG.find((candidate) => candidate.id === itemId);
    if (!ware || !item || wareState(characterStore.character, ware, accountStore.account.gems) !== 'buy') return false;
    return offerItem(item, { price: ware.price, currency: ware.currency ?? 'gold', pay: () => pay(itemId, ware.price) });
  }

  /** Takes the price (gold, or the account's gems for a gem ware) and hands the item over. False (nothing spent) if it can no longer be bought. */
  function pay(itemId: string, price: number): boolean {
    const result = buyWare(characterStore.character, itemId, accountStore.account.gems);
    if (!result || (result.gemsSpent > 0 && !accountStore.spendGems(result.gemsSpent))) return false;
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry(
      result.gemsSpent > 0 ? { kind: 'vault-bought', name: result.item.name, gems: result.gemsSpent } : { kind: 'shop-bought', name: result.item.name, gold: price },
    );
    return true;
  }

  /** Pays the restock fee and redraws the stock. False if there's no stock or too little gold. */
  function restock(): boolean {
    const since = Date.now() - lastRestockAt;
    if (since >= 0 && since < RESTOCK_GUARD_MS) return false;
    const result = restockShop(characterStore.character, bossStore.boss.index, rng);
    if (!result) return false;
    lastRestockAt = Date.now();
    characterStore.setCharacter(result.character);
    activityLogStore.addEntry({ kind: 'shop-restocked', gold: result.fee });
    return true;
  }

  /** A tonic's row: price, status and days left today. */
  function tonic(id: TonicId) {
    return tonicState(characterStore.character, id, bossStore.boss.index, today());
  }

  /** Buys a tonic and uses it at once. False (nothing spent) unless its row reads `buy`. */
  function buyTonic(id: TonicId): boolean {
    const { price } = tonic(id);
    const result = buyTonicRule(characterStore.character, id, bossStore.boss.index, today());
    if (!result) return false;
    characterStore.setCharacter(result.character);
    const def = TONIC_DEFS.find((entry) => entry.id === id);
    const name = def?.name ?? id;
    activityLogStore.addEntry({ kind: 'shop-bought', name, gold: price });
    if (result.healed) activityLogStore.addEntry({ kind: 'event-heal', amount: result.healed });
    if (def) toast.show({ art: def.art, title: name, text: TONIC_DONE[id](result.healed ?? 0), tone: TONIC_TONES[id] });
    return true;
  }

  return { stock, todayKey, ensureStock, buy, restock, restockPrice, buyTonic, tonic };
}
