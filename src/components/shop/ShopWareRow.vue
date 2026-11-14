<script setup lang="ts">
import type { ItemDef } from '../../game-engine';
import StatIcon from '../ui/StatIcon.vue';
import type { StatIconName } from '../ui/statIcons';
import ShopBuyButton from './ShopBuyButton.vue';
import ShopItemLines from './ShopItemLines.vue';

// One row on the Shop: a socket (the item's art, or an icon for a tonic or the
// restock), its name and what it does, and the buy button. `warn` is a small
// line under it, e.g. that a buy swaps out a worn item.
defineProps<{
  kind: 'item' | 'tonic' | 'restock' | 'service';
  name: string;
  item?: ItemDef;
  icon?: StatIconName;
  text?: string;
  price: number;
  buyable: boolean;
  short?: boolean;
  label?: string;
  warn?: string;
  /** What the service has cost this run; its price climbs with it. */
  bought?: number;
}>();
defineEmits<{ buy: [] }>();
const baseUrl = import.meta.env.BASE_URL;
</script>

<template>
  <div class="shop-ware-row" :class="[kind, item && `rarity-${item.rarity}`]">
    <span class="shop-socket">
      <img v-if="item" class="shop-art" :src="`${baseUrl}sprites/${item.icon}.png`" alt="" />
      <StatIcon v-else-if="icon" :name="icon" :size="26" />
    </span>
    <div class="shop-mid">
      <strong class="shop-name">{{ name }}</strong>
      <ShopItemLines v-if="item" :item="item" />
      <p v-else class="shop-text">{{ text }}</p>
      <p v-if="bought" class="shop-warn shop-climb">Bought {{ bought }} · dearer each time</p>
      <p v-if="warn" class="shop-warn">{{ warn }}</p>
    </div>
    <ShopBuyButton :price="price" :buyable="buyable" :short="short" :label="label" @buy="$emit('buy')" />
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. The socket and
   art take the Hero rack's sizes, a whole number of device px per art pixel. */
.shop-ware-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px 7px 7px;
}

.shop-socket {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--rack-slot);
  height: var(--rack-slot);
  overflow: hidden;
}

.shop-art {
  width: var(--rack-art);
  height: var(--rack-art);
  max-width: none;
  image-rendering: pixelated;
}

.shop-mid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.shop-text,
.shop-warn {
  margin: 0;
}
</style>
