<script setup lang="ts">
import { rankNumeral } from './habitDisplay';

// One diamond per rank, on one line. The rank also comes as a numeral, hidden
// here, for themes that show it instead (Ashen's numeral plate). An unranked
// skill gets an empty slot, hidden here too, so such a theme can keep the
// rank's column in line.
defineProps<{ rank: number }>();
</script>

<template>
  <span v-if="rank > 0" class="rank-diamonds" role="img" :aria-label="`Rank ${rankNumeral(rank)}`">
    <i v-for="n in rank" :key="n" />
    <b class="rank-numeral">{{ rankNumeral(rank) }}</b>
  </span>
  <span v-else class="rank-slot" aria-hidden="true" />
</template>

<style scoped>
.rank-diamonds {
  display: inline-flex;
  align-items: center;
  gap: 1.5px;
  flex-shrink: 0;
}

.rank-diamonds i {
  width: 6px;
  height: 6px;
  background: var(--accent);
  transform: rotate(45deg);
}

.rank-numeral,
.rank-slot {
  display: none;
}
</style>
