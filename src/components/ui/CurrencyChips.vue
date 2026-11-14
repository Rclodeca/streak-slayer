<script setup lang="ts">
import { formatCompact } from '../../game-engine';
import StatIcon from './StatIcon.vue';

// Gold and gems side by side: a purse (showZero, the empty one greyed) or a
// price (a 0 left out, so a gold-only price shows just gold).
withDefaults(defineProps<{ gold: number; gems: number; showZero?: boolean }>(), { showZero: false });
</script>

<template>
  <span class="currency">
    <span v-if="showZero || gold > 0" class="chip gold">
      <StatIcon name="gold" :size="15" /><span class="count" :class="{ zero: gold === 0 }">{{ formatCompact(gold) }}</span>
    </span>
    <span v-if="showZero || gems > 0" class="chip gems">
      <StatIcon name="gems" :size="15" /><span class="count" :class="{ zero: gems === 0 }">{{ formatCompact(gems) }}</span>
    </span>
  </span>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.currency {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
}
</style>
