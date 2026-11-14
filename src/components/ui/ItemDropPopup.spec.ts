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

  it('a bought item says Bought! and names no boss', async () => {
    const item = ITEM_CATALOG.find((i) => i.type === 'equipment')!;
    const characterStore = useCharacterStore();
    characterStore.character = { ...characterStore.character, ownedItemIds: [item.id], equippedItemIds: [] };
    useItemDropQueue().enqueueDrops([item], undefined, true);
    mount(ItemDropPopup, { attachTo: document.body, global: { plugins: [pinia] } });
    await flushPromises();
    expect(document.body.textContent).toContain('Bought!');
    expect(document.body.textContent).not.toContain('Item found!');
    expect(document.querySelector('.dropped-by')).toBeNull();
  });
});
