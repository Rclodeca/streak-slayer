<script setup lang="ts">
import CurrencyChips from '../ui/CurrencyChips.vue';

// A ware's buy button: its gold price while it can be bought (greyed and
// disabled when too dear), else a word for why not (`label`: Sold, Owned, 2d left…).
defineProps<{ price: number; buyable: boolean; short?: boolean; label?: string }>();
defineEmits<{ buy: [] }>();
</script>

<template>
  <button type="button" class="shop-buy" :class="{ short, spent: !!label }" :disabled="!buyable" @click="$emit('buy')">
    <template v-if="label">{{ label }}</template>
    <CurrencyChips v-else :gold="price" :gems="0" />
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
</style>
