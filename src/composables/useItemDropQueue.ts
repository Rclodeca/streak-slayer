// Small shared (module-scoped) queue for boss-kill item drops — same
// singleton reasoning as the old useLootToast it replaces: the component
// that triggers a drop (HabitListItem) and the component that renders the
// popup (ItemDropPopup, mounted once in AppShell) must see the same state.
//
// Each queued item is resolved one of two ways: if there's an open equip
// slot at the moment it's processed, it's auto-equipped immediately (the
// popup is then purely informational — `dismiss()` just advances the
// queue). If all 4 slots are full, the item waits for `replace(oldItemId)`
// to swap it in. Processing one item at a time (rather than checking room
// once for the whole batch) is what lets a multi-item drop fill any
// remaining slots before the forced-choice popup ever appears.
//
// A boss kill's drops carry the boss's name (`droppedBy`) so the popup can
// say where they came from; event, quest and backfilled drops have none.
//
// A shop's item comes as an `offer`: not yet paid for or owned, and never
// auto-equipped. With a slot open the popup asks to confirm, and `accept()`
// pays and equips it; with every slot full, `replace(oldItemId)` pays and
// swaps it in. Turning it down (`dismiss()`) costs nothing and leaves it in
// the shop.

import { computed, ref } from 'vue';
import { maxEquipSlots } from '../game-engine';
import type { ItemDef } from '../game-engine';
import { useCharacterStore } from '../store/characterStore';
import { useDeathScreen } from './useDeathScreen';

/** A shop's item for sale. `pay` takes the price and hands the item over, false if it no longer can. */
export interface ItemOffer {
  price: number;
  currency: 'gold' | 'gems';
  pay: () => boolean;
}

const queue = ref<{ item: ItemDef; droppedBy?: string; offer?: ItemOffer }[]>([]);

export function useItemDropQueue() {
  const characterStore = useCharacterStore();
  const { isDead } = useDeathScreen();

  // Hidden while the death screen is up: a boss kill and a death can land in
  // the same pass, and the drop popup would otherwise paint over the death
  // screen. The run goes on after "Rise again", so they show once it closes;
  // a prestige's new run discards them (`clear()`).
  const current = computed<ItemDef | null>(() => (isDead.value ? null : queue.value[0]?.item ?? null));
  const droppedBy = computed<string | null>(() => (isDead.value ? null : queue.value[0]?.droppedBy ?? null));
  const offer = computed<ItemOffer | null>(() => (isDead.value ? null : queue.value[0]?.offer ?? null));
  const isFull = computed(() => characterStore.character.equippedItemIds.length >= maxEquipSlots(characterStore.character));

  function processFront() {
    const front = current.value;
    if (front && !offer.value && !isFull.value) {
      characterStore.equipItem(front.id);
    }
  }

  function next() {
    queue.value.shift();
    processFront();
  }

  function enqueueDrops(items: ItemDef[], droppedBy?: string) {
    queue.value.push(...items.map((item) => ({ item, droppedBy })));
    processFront();
  }

  /** Offers a shop's item. False (nothing queued) if that item is already on offer. */
  function offerItem(item: ItemDef, itemOffer: ItemOffer): boolean {
    if (queue.value.some((entry) => entry.offer && entry.item.id === item.id)) return false;
    queue.value.push({ item, offer: itemOffer });
    processFront();
    return true;
  }

  /** Pays for the offered item and equips it into an open slot. */
  function accept() {
    const front = current.value;
    if (!front || !offer.value) return;
    if (!isFull.value && offer.value.pay()) characterStore.equipItem(front.id);
    next();
  }

  function dismiss() {
    const front = current.value;
    // An unequipped front item was declined (no slot, player chose to drop
    // it): it's gone, and goes back into the drop pool. An offer was never
    // owned, so there's nothing to give back.
    if (front && !offer.value && !characterStore.character.equippedItemIds.includes(front.id)) {
      characterStore.discardItem(front.id);
    }
    next();
  }

  function replace(oldItemId: string) {
    const front = current.value;
    if (!front) return;
    if (offer.value && !offer.value.pay()) {
      next();
      return;
    }
    characterStore.discardItem(oldItemId);
    characterStore.equipItem(front.id);
    queue.value.shift();
    processFront();
  }

  function clear() {
    queue.value = [];
  }

  return { current, droppedBy, offer, isFull, enqueueDrops, offerItem, accept, dismiss, replace, clear };
}
