<script setup lang="ts">
import { computed, watch } from 'vue';
import { FlaskConical, RefreshCw, Swords } from 'lucide-vue-next';
import { ITEM_CATALOG, TONIC_DEFS, characterGold, wareState } from '../../game-engine';
import type { ShopWare, TonicId } from '../../game-engine';
import { useShop } from '../../composables/useShop';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import SectionTitle from '../ui/SectionTitle.vue';
import StatIcon from '../ui/StatIcon.vue';
import ShopFeatured from './ShopFeatured.vue';
import ShopWareRow from './ShopWareRow.vue';

// The Items side (docs/mockups/shop-tab-3.html): the day's headline on velvet,
// always in gold, then the wares (any others of the headline's rarity in gems,
// first) and the potions, one of each every 3 days. All of it is used at once.
// At the foot, a small Restock key (docs/mockups/restock.html, A) redraws the
// wares and puts the potions back. The stock is redrawn whenever it isn't
// today's: first open, the day turning (or the dev Skip day), and a new run
// after a death.
const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const shop = useShop();

watch(
  () => characterStore.character.shop?.dayKey !== shop.todayKey.value,
  (stale) => {
    if (stale) shop.ensureStock();
  },
  { immediate: true },
);

const LABELS = { sold: 'Out of stock', owned: 'Owned' } as const;

/** A stocked ware's row: its item, price and button. */
function viewOf(ware: ShopWare) {
  const item = ITEM_CATALOG.find((candidate) => candidate.id === ware.itemId);
  if (!item) return null;
  const state = wareState(characterStore.character, ware, accountStore.account.gems);
  return {
    item,
    price: ware.price,
    currency: ware.currency ?? ('gold' as const),
    buyable: state === 'buy',
    short: state === 'short',
    label: state === 'sold' || state === 'owned' ? LABELS[state] : undefined,
    buy: () => shop.buy(item.id),
  };
}

const featured = computed(() => (shop.stock.value?.featured ? viewOf(shop.stock.value.featured) : null));
const wares = computed(() => (shop.stock.value?.wares ?? []).flatMap((ware) => viewOf(ware) ?? []));

const potions = computed(() =>
  TONIC_DEFS.map((def) => {
    const state = shop.tonic(def.id);
    const label =
      state.status === 'active'
        ? `${state.daysLeft}d left`
        : state.status === 'out'
          ? 'Out of stock'
          : state.status === 'full'
            ? 'Full health'
            : undefined;
    return { ...def, price: state.price, buyable: state.status === 'buy', short: state.status === 'short', label };
  }),
);

const restockBuyable = computed(() => shop.stock.value !== null && characterGold(characterStore.character) >= shop.restockPrice.value);

function buyPotion(id: TonicId) {
  shop.buyTonic(id);
}
</script>

<template>
  <div class="shop-wares">
    <ShopFeatured
      v-if="featured"
      :item="featured.item"
      :price="featured.price"
      :buyable="featured.buyable"
      :short="featured.short"
      :label="featured.label"
      :currency="featured.currency"
      @buy="featured.buy()"
    />

    <SectionTitle title="Wares"><Swords :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        v-for="row in wares"
        :key="row.item.id"
        kind="item"
        :name="row.item.name"
        :item="row.item"
        :price="row.price"
        :buyable="row.buyable"
        :short="row.short"
        :label="row.label"
        :currency="row.currency"
        @buy="row.buy()"
      />
    </div>

    <SectionTitle title="Potions"><FlaskConical :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        v-for="potion in potions"
        :key="potion.id"
        kind="tonic"
        :name="potion.name"
        :art="potion.art"
        :text="potion.effect"
        :price="potion.price"
        :buyable="potion.buyable"
        :short="potion.short"
        :label="potion.label"
        @buy="buyPotion(potion.id)"
      />
    </div>

    <div class="shop-restock">
      <p class="shop-note">New stock every day.</p>
      <button type="button" class="shop-restock-key" :class="{ short: !restockBuyable }" :disabled="!restockBuyable" @click="shop.restock()">
        <RefreshCw :size="14" aria-hidden="true" />Restock now
        <span class="price" :aria-label="`${shop.restockPrice.value} gold`"><StatIcon name="gold" :size="13" />{{ shop.restockPrice.value.toLocaleString('en-US') }}</span>
      </button>
    </div>
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

.shop-restock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
}

.shop-note {
  margin: 0;
  text-align: center;
}

.shop-restock-key {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  white-space: nowrap;
}

.shop-restock-key .price {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
