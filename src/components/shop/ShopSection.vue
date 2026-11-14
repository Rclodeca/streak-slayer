<script setup lang="ts">
import { Gem, Store } from 'lucide-vue-next';
import { useTabStore } from '../../store/tabStore';
import type { ShopSide } from '../../store/tabStore';
import SealedNotice from '../quests/SealedNotice.vue';

// The Shop tab under the shopkeeper's scene (docs/mockups/shop-tab-2.html, A's
// UI): a plain Shop | Vault switch, then that side's wares. The Shop sells for
// gold; the Vault (gems) stays shut until it has wares of its own.
const tabStore = useTabStore();
const SIDES: { id: ShopSide; label: string; icon: typeof Store }[] = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'vault', label: 'Vault', icon: Gem },
];
</script>

<template>
  <section class="shop-section">
    <div class="shop-switch" role="tablist" aria-label="Shop or Vault">
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
        <component :is="side.icon" :size="16" aria-hidden="true" />{{ side.label }}
      </button>
    </div>
    <div v-if="tabStore.shopSide === 'shop'" class="shop-body" />
    <SealedNotice v-else text="The vault is shut." />
  </section>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
}

.shop-side {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}
</style>
