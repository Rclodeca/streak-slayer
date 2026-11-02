<script setup lang="ts">
import { rankNumeral } from './habitDisplay';

// A skill's rank (0 to 8, never lost) as tiny brass squares, one per rank,
// in fours. Unranked shows nothing.
defineProps<{ rank: number }>();
</script>

<template>
  <span v-if="rank > 0" class="rank-pips" role="img" :aria-label="`Rank ${rankNumeral(rank)}`">
    <i v-for="n in rank" :key="n" />
  </span>
</template>

<style scoped>
.rank-pips {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.rank-pips i {
  width: 4px;
  height: 4px;
  background: var(--brass, var(--accent));
}

/* A gap after the fourth, so a rank reads at a glance. */
.rank-pips i:nth-child(5) {
  margin-left: 4px;
}
</style>
