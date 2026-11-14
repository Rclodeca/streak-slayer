<script setup lang="ts">
import { computed, watch } from 'vue';
import { Flame, Swords } from 'lucide-vue-next';
import { ITEM_CATALOG, TONIC_DEFS, characterGold, wareState } from '../../game-engine';
import type { ItemDef, ShopWare, TonicId } from '../../game-engine';
import { useShop } from '../../composables/useShop';
import { useCharacterStore } from '../../store/characterStore';
import SectionTitle from '../ui/SectionTitle.vue';
import type { StatIconName } from '../ui/statIcons';
import ShopFeatured from './ShopFeatured.vue';
import ShopWareRow from './ShopWareRow.vue';

// The Shop side (docs/mockups/shop-tab-2.html, A): the day's piece on velvet,
// then the wares, the tonics and the restock. Everything is bought with gold
// and used at once. Draws a new stock whenever the one on hand isn't today's:
// first open, a new day (or the dev Skip day), and a new run after a death.
const characterStore = useCharacterStore();
const shop = useShop();

watch(
  () => characterStore.character.shop?.dayKey !== shop.todayKey.value,
  (stale) => {
    if (stale) shop.ensureStock();
  },
  { immediate: true },
);

const LABELS = { sold: 'Sold', owned: 'Owned' } as const;
const SWAPS = 'Swaps one out';

function itemOf(ware: ShopWare): ItemDef | undefined {
  return ITEM_CATALOG.find((item) => item.id === ware.itemId);
}

/** The button and warning a stocked item shows. */
function wareView(ware: ShopWare) {
  const state = wareState(characterStore.character, ware);
  const buyable = state === 'buy';
  return {
    buyable,
    short: state === 'short',
    label: state === 'sold' || state === 'owned' ? LABELS[state] : undefined,
    warn: (buyable || state === 'short') && shop.slotsFull.value ? SWAPS : undefined,
  };
}

const featured = computed(() => {
  const ware = shop.stock.value?.featured;
  const item = ware && itemOf(ware);
  return ware && item ? { ware, item, ...wareView(ware) } : null;
});
const wares = computed(() =>
  (shop.stock.value?.wares ?? []).flatMap((ware) => {
    const item = itemOf(ware);
    return item ? [{ ware, item, ...wareView(ware) }] : [];
  }),
);

const tonics = computed(() =>
  TONIC_DEFS.map((def) => {
    const state = shop.tonic(def.id);
    const label =
      state.status === 'active'
        ? `${state.daysLeft}d left`
        : state.status === 'cooldown'
          ? `Again in ${state.daysLeft}d`
          : state.status === 'full'
            ? 'Full health'
            : undefined;
    return { ...def, icon: def.icon as StatIconName, price: state.price, buyable: state.status === 'buy', short: state.status === 'short', label };
  }),
);

const restockBuyable = computed(() => shop.stock.value !== null && characterGold(characterStore.character) >= shop.restockPrice.value);

function buyTonic(id: TonicId) {
  shop.buyTonic(id);
}
</script>

<template>
  <div class="shop-wares">
    <ShopFeatured
      v-if="featured"
      :item="featured.item"
      :price="featured.ware.price"
      :buyable="featured.buyable"
      :short="featured.short"
      :label="featured.label"
      :warn="featured.warn"
      @buy="shop.buy(featured.item.id)"
    />

    <SectionTitle title="Wares"><Swords :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        v-for="row in wares"
        :key="row.ware.itemId"
        kind="item"
        :name="row.item.name"
        :item="row.item"
        :price="row.ware.price"
        :buyable="row.buyable"
        :short="row.short"
        :label="row.label"
        :warn="row.warn"
        @buy="shop.buy(row.item.id)"
      />
    </div>

    <SectionTitle title="Tonics"><Flame :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        v-for="tonic in tonics"
        :key="tonic.id"
        kind="tonic"
        :name="tonic.name"
        :icon="tonic.icon"
        :text="tonic.effect"
        :price="tonic.price"
        :buyable="tonic.buyable"
        :short="tonic.short"
        :label="tonic.label"
        @buy="buyTonic(tonic.id)"
      />
      <ShopWareRow
        class="shop-restock"
        kind="restock"
        name="Restock"
        icon="restock"
        text="New wares, now."
        :price="shop.restockPrice.value"
        :buyable="restockBuyable"
        :short="!restockBuyable"
        @buy="shop.restock()"
      />
    </div>

    <p class="shop-note">New stock each dawn, and when you fall.</p>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-wares,
.shop-rows {
  display: flex;
  flex-direction: column;
}

.shop-wares {
  gap: 12px;
}

.shop-rows {
  gap: 6px;
}

.shop-note {
  margin: 0;
  text-align: center;
}
</style>
