<script setup lang="ts">
import { computed } from 'vue';
import type { ItemDef } from '../../game-engine';

// Twinkling pluses in the corners of an epic or relic item's slot
// (docs/mockups/pixel-hero-tab.html): three for epic, five for relic. Put it
// in a positioned slot; the sparks paint over the art. Each spark has its
// own timing, and `seed` (the row's index) offsets them so rows never pulse
// together. Only opacity and scale animate.
const props = withDefaults(defineProps<{ rarity: ItemDef['rarity']; seed?: number }>(), { seed: 0 });

const SPOTS = [
  [12, 14],
  [87, 12],
  [88, 79],
  [13, 82],
  [50, 8],
];
const COUNT: Partial<Record<ItemDef['rarity'], number>> = { epic: 3, relic: 5 };

const sparks = computed(() =>
  SPOTS.slice(0, COUNT[props.rarity] ?? 0).map(([x, y], i) => ({
    x,
    y,
    duration: 2.4 + (i % 3) * 0.55,
    delay: -(i * 0.97 + props.seed * 0.63),
    own: i % 2 === 1,
  })),
);
</script>

<template>
  <i
    v-for="(spark, i) in sparks"
    :key="i"
    class="spark"
    :class="{ own: spark.own }"
    aria-hidden="true"
    :style="{ left: `${spark.x}%`, top: `${spark.y}%`, animationDuration: `${spark.duration}s`, animationDelay: `${spark.delay}s` }"
  />
</template>

<style scoped>
.spark {
  position: absolute;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  color: #fff;
  z-index: 1; /* over the art */
  pointer-events: none;
  opacity: 0;
  background:
    linear-gradient(currentColor, currentColor) center / 2px 100% no-repeat,
    linear-gradient(currentColor, currentColor) center / 100% 2px no-repeat;
  animation: item-spark 2.4s ease-in-out infinite;
}

/* Every other spark takes the item's rarity colour. */
.spark.own {
  color: var(--rarity);
}

@keyframes item-spark {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.4);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* No motion: the sparks just sit there, lit. */
@media (prefers-reduced-motion: reduce) {
  .spark {
    opacity: 0.8;
    animation: none;
  }
}
</style>
