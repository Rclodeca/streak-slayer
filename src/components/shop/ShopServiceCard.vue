<script setup lang="ts">
import { computed, ref } from 'vue';
import { Clock } from 'lucide-vue-next';
import type { ServiceId } from '../../game-engine';
import { useCenteredArt } from '../../composables/useCenteredArt';
import ShopBuyButton from './ShopBuyButton.vue';

// The service on offer this turn (docs/mockups/services-rotation.html): its
// scene across the top with the days left, its name and what it does, the
// buy button, and a peek at the next one's seal under it. The scene is 216 x
// 64 art px at 2 CSS px per art pixel, as wide as the other backdrops,
// centred by a whole-px offset and cropped evenly on narrow phones.
const ART_W = 432;
const props = defineProps<{
  id: ServiceId;
  name: string;
  text: string;
  price: number;
  buyable: boolean;
  short?: boolean;
  label?: string;
  daysLeft: number;
  next: { id: ServiceId; name: string };
  /** What a buy changes, e.g. "7 → 8 slots". */
  change?: string;
}>();
defineEmits<{ buy: [] }>();
const baseUrl = import.meta.env.BASE_URL;
const left = computed(() => `${props.daysLeft}d left`);

const frame = ref<HTMLElement | null>(null);
const offset = useCenteredArt(frame, ART_W);
</script>

<template>
  <article class="shop-featured service-turn">
    <div ref="frame" class="velvet" :style="{ '--art-x': `${offset}px` }">
      <img class="service-scene" :src="`${baseUrl}sprites/services/${id}-scene.png`" alt="" />
      <span class="ribbon"><Clock :size="11" aria-hidden="true" />{{ left }}</span>
    </div>
    <div class="featured-body">
      <strong class="shop-name">{{ name }}</strong>
      <p class="shop-text">{{ text }}</p>
      <p v-if="change" class="shop-text service-change">{{ change }}</p>
      <div class="featured-foot">
        <ShopBuyButton :price="price" :buyable="buyable" :short="short" :label="label" @buy="$emit('buy')" />
      </div>
    </div>
    <div class="service-next">
      <img class="service-next-seal" :src="`${baseUrl}sprites/services/${next.id}.png`" alt="" />
      Next <b>{{ next.name }}</b>
      <span class="service-next-when">in {{ daysLeft }}d</span>
    </div>
  </article>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.velvet {
  position: relative;
  height: 128px;
  overflow: hidden;
}

.service-scene {
  position: absolute;
  left: var(--art-x);
  top: 0;
  width: 432px;
  height: 128px;
  max-width: none;
  image-rendering: pixelated;
}

.ribbon {
  position: absolute;
  z-index: 1;
  left: 10px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.featured-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px 12px;
}

.shop-text {
  margin: 0;
}

.featured-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.service-next {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.service-next-seal {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.service-next-when {
  margin-left: auto;
}
</style>
