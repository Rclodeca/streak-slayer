// @vitest-environment jsdom

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useItemDropQueue } from '../../composables/useItemDropQueue';
import { ITEM_CATALOG } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import ItemDropPopup from './ItemDropPopup.vue';

enableAutoUnmount(afterEach);

describe('ItemDropPopup', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  // The queue is a module-scope singleton, so drain it between tests.
  afterEach(() => {
    const { current, dismiss } = useItemDropQueue();
    while (current.value) dismiss();
  });

  // Every slot full, so each drop waits on Drop or Replace. The real Teleport
  // is kept (not stubbed) so the popup's elements survive re-renders and keep
  // their scroll position, as in the app.
  function mountWithDrops(count: number) {
    const gear = ITEM_CATALOG.filter((item) => item.type === 'equipment').slice(0, 4 + count);
    const equipped = gear.slice(0, 4).map((item) => item.id);
    const characterStore = useCharacterStore();
    characterStore.character = { ...characterStore.character, ownedItemIds: equipped, equippedItemIds: equipped };
    useItemDropQueue().enqueueDrops(gear.slice(4));
    return mount(ItemDropPopup, { attachTo: document.body, global: { plugins: [pinia] } });
  }

  it('pins Drop in the footer, outside the scrolling replace list', () => {
    mountWithDrops(1);
    expect(document.querySelector('.modal-footer .drop-button')).not.toBeNull();
    expect(document.querySelector('.modal-scroll .drop-button')).toBeNull();
  });

  it('opens the next drop scrolled back to the top', async () => {
    mountWithDrops(2);
    const scroller = document.querySelector('.modal-scroll')!;
    scroller.scrollTop = 300;

    document.querySelector<HTMLButtonElement>('.drop-button')!.click();
    await flushPromises();

    expect(document.querySelector('.modal-scroll')).toBe(scroller);
    expect(scroller.scrollTop).toBe(0);
  });

  const offerOf = (price: number) => {
    let paid = 0;
    return { offer: { price, currency: 'gold' as const, pay: () => (paid++, true) }, paid: () => paid };
  };

  it('a shop item with room asks to Purchase Item and pays only on Buy', async () => {
    const item = ITEM_CATALOG.find((i) => i.type === 'equipment')!;
    const characterStore = useCharacterStore();
    characterStore.character = { ...characterStore.character, ownedItemIds: [item.id], equippedItemIds: [] };
    const { offer, paid } = offerOf(120);
    useItemDropQueue().offerItem(item, offer);
    mount(ItemDropPopup, { attachTo: document.body, global: { plugins: [pinia] } });
    await flushPromises();
    expect(document.body.textContent).toContain('Purchase Item');
    expect(document.querySelector('.dropped-by')).toBeNull();
    expect(characterStore.character.equippedItemIds).not.toContain(item.id);
    expect(paid()).toBe(0);
    document.querySelector<HTMLButtonElement>('.offer-acts .shop-buy')!.click();
    await flushPromises();
    expect(paid()).toBe(1);
    expect(characterStore.character.equippedItemIds).toContain(item.id);
  });

  it('a shop item with full slots pays on Replace, and Cancel pays nothing', async () => {
    const wrapper = mountWithDrops(0);
    const item = ITEM_CATALOG.filter((i) => i.type === 'equipment')[5];
    // The shop's pay hands the item over; here it's owned up front.
    const characterStore = useCharacterStore();
    characterStore.character = { ...characterStore.character, ownedItemIds: [...characterStore.character.ownedItemIds, item.id] };
    const first = offerOf(120);
    useItemDropQueue().offerItem(item, first.offer);
    await flushPromises();
    expect(document.querySelector('.modal-footer .drop-button')!.textContent).toBe('Cancel');
    document.querySelector<HTMLButtonElement>('.modal-footer .drop-button')!.click();
    await flushPromises();
    expect(first.paid()).toBe(0);
    const second = offerOf(120);
    useItemDropQueue().offerItem(item, second.offer);
    await flushPromises();
    document.querySelector<HTMLButtonElement>('.replace-button')!.click();
    await flushPromises();
    expect(second.paid()).toBe(1);
    expect(useCharacterStore().character.equippedItemIds).toContain(item.id);
    wrapper.unmount();
  });
});
