<script setup lang="ts">
import StatIcon from '../ui/StatIcon.vue';

// A ware's buy button: its price in gold (or gems, in the Vault) while it can
// be bought (greyed and disabled when too dear), else a word for why not
// (`label`: Sold, Owned, 2d left…).
withDefaults(defineProps<{ price: number; buyable: boolean; short?: boolean; label?: string; currency?: 'gold' | 'gems' }>(), { currency: 'gold' });
defineEmits<{ buy: [] }>();
</script>

<template>
  <button type="button" class="shop-buy" :class="{ short, spent: !!label }" :disabled="!buyable" @click="$emit('buy')">
    <template v-if="label">{{ label }}</template>
    <span v-else class="price" :aria-label="`${price} ${currency}`"><StatIcon :name="currency" :size="13" />{{ price.toLocaleString('en-US') }}</span>
  </button>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-buy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  min-height: 44px;
  padding: 0 10px;
  white-space: nowrap;
}

.price {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
