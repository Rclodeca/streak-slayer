<script setup lang="ts">
import { HandCoins, Lock, Shirt, Sword } from 'lucide-vue-next';
import { watch } from 'vue';
import { shopGateOpen, UNLOCK_LEVELS } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useShopNews } from '../../composables/useShopNews';
import { useTabStore } from '../../store/tabStore';
import type { ShopSide } from '../../store/tabStore';
import ShopItems from './ShopItems.vue';
import ShopServices from './ShopServices.vue';
import ShopVault from './ShopVault.vue';

// Under the shopkeeper's scene (docs/mockups/shop-tab-3.html, A): a plain
// Items | Services | Looks switch, then that side's wares. The sides split by
// what's bought, not by coin: each price shows its own, gold or gems. A red dot
// marks a side with something new (useShopNews); showing a side clears it, and
// again if the day or the service turns while it stays open. Services and Looks
// are sealed under a lock until their UNLOCK_LEVELS level, and can't be tapped.
const tabStore = useTabStore();
const shopNews = useShopNews();
const characterStore = useCharacterStore();
const SIDES: { id: ShopSide; label: string; icon: typeof Sword }[] = [
  { id: 'items', label: 'Items', icon: Sword },
  { id: 'services', label: 'Services', icon: HandCoins },
  { id: 'vault', label: 'Looks', icon: Shirt },
];

/** Whether `side` is still sealed: Items opens with the Shop itself. */
function isSealed(side: ShopSide): boolean {
  if (side === 'items') return false;
  return !shopGateOpen(characterStore.character, side === 'vault' ? 'looks' : 'services');
}

// A sealed side left selected (a new hero, or a way in from elsewhere) falls back to Items.
watch(
  () => isSealed(tabStore.shopSide),
  (sealed) => {
    if (sealed) tabStore.selectShopSide('items');
  },
  { immediate: true },
);

watch(
  () => [tabStore.shopSide, shopNews.todayKey.value, shopNews.turnStart.value] as const,
  ([side]) => {
    if (!isSealed(side)) shopNews.see(side);
  },
  { immediate: true },
);
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
        :class="[`side-${side.id}`, { selected: tabStore.shopSide === side.id, sealed: isSealed(side.id) }]"
        :aria-selected="tabStore.shopSide === side.id"
        :disabled="isSealed(side.id)"
        :aria-label="isSealed(side.id) ? `${side.label}, opens at level ${UNLOCK_LEVELS[side.id === 'vault' ? 'looks' : 'services']}` : undefined"
        @click="tabStore.selectShopSide(side.id)"
      >
        <component :is="isSealed(side.id) ? Lock : side.icon" :size="15" aria-hidden="true" />{{ side.label }}
        <span v-if="shopNews.isNew(side.id)" class="side-new" role="img" aria-label="New" />
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
  position: relative;
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

.side-new {
  position: absolute;
  top: 5px;
  right: 8px;
  width: 10px;
  height: 10px;
}
</style>
