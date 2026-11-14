<script setup lang="ts">
import { computed } from 'vue';
import type { ItemDef } from '../../game-engine';
import ShopBuyButton from './ShopBuyButton.vue';
import ShopItemLines from './ShopItemLines.vue';

// The day's piece on velvet (docs/mockups/shop-tab-2.html): an epic or relic on
// the days the shop has one, else its rare. The art is drawn at 3 CSS px per
// art pixel (96px), whole device pixels on 2x and 3x screens.
// The Vault passes its own `ribbon`, `keep` line and gem `currency`.
const props = defineProps<{ item: ItemDef; price: number; buyable: boolean; short?: boolean; label?: string; warn?: string; ribbon?: string; keep?: string; currency?: 'gold' | 'gems' }>();
defineEmits<{ buy: [] }>();
const baseUrl = import.meta.env.BASE_URL;
const ribbonText = computed(() => props.ribbon ?? `${props.item.rarity.charAt(0).toUpperCase()}${props.item.rarity.slice(1)} of the day`);
</script>

<template>
  <article class="shop-featured" :class="`rarity-${item.rarity}`">
    <div class="velvet">
      <span class="ribbon">{{ ribbonText }}</span>
      <img class="featured-art" :src="`${baseUrl}sprites/${item.icon}.png`" :alt="item.name" />
    </div>
    <div class="featured-body">
      <strong class="shop-name">{{ item.name }}</strong>
      <ShopItemLines :item="item" />
      <p v-if="warn" class="shop-warn">{{ warn }}</p>
      <div class="featured-foot">
        <span class="featured-keep">{{ keep ?? 'Gone when you fall' }}</span>
        <ShopBuyButton :price="price" :buyable="buyable" :short="short" :label="label" :currency="currency" @buy="$emit('buy')" />
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.velvet {
  position: relative;
  height: 120px;
  display: grid;
  place-items: center;
}

.ribbon {
  position: absolute;
  left: 10px;
  top: 10px;
}

.featured-art {
  width: 96px;
  height: 96px;
  max-width: none;
  image-rendering: pixelated;
  animation: featured-bob 2.4s ease-in-out infinite;
}

@keyframes featured-bob {
  50% {
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .featured-art {
    animation: none;
  }
}

.featured-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px 12px;
}

.featured-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
}

.shop-warn {
  margin: 0;
}
</style>
