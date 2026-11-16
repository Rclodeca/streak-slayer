<script setup lang="ts">
import { HandCoins, Shirt, Sword } from 'lucide-vue-next';
import { useTabStore } from '../../store/tabStore';
import type { ShopSide } from '../../store/tabStore';
import ShopItems from './ShopItems.vue';
import ShopServices from './ShopServices.vue';
import ShopVault from './ShopVault.vue';

// Under the shopkeeper's scene (docs/mockups/shop-tab-3.html, A): a plain
// Items | Services | Looks switch, then that side's wares. The sides split by
// what's bought, not by coin: each price shows its own, gold or gems.
const tabStore = useTabStore();
const SIDES: { id: ShopSide; label: string; icon: typeof Sword }[] = [
  { id: 'items', label: 'Items', icon: Sword },
  { id: 'services', label: 'Services', icon: HandCoins },
  { id: 'vault', label: 'Looks', icon: Shirt },
];
</script>

<template>
  <div class="shop-counter">
    <div class="shop-switch" role="tablist" aria-label="Items, Services or Looks">
      <button
        v-for="side in SIDES"
        :key="side.id"
        type="button"
        role="tab"
        class="shop-side"
        :class="[`side-${side.id}`, { selected: tabStore.shopSide === side.id }]"
        :aria-selected="tabStore.shopSide === side.id"
        @click="tabStore.selectShopSide(side.id)"
      >
        <component :is="side.icon" :size="15" aria-hidden="true" />{{ side.label }}
      </button>
    </div>
    <ShopItems v-if="tabStore.shopSide === 'items'" />
    <ShopServices v-else-if="tabStore.shopSide === 'services'" />
    <ShopVault v-else />
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-counter {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 3px;
}

.shop-side {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 44px;
  padding: 0 2px;
  border: 0;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}
</style>
