<script setup lang="ts">
import type { SkinTile, SkinTileState } from '../../composables/useSkinTiles';
import StatIcon from '../ui/StatIcon.vue';

// One look in the Vault (docs/mockups/vault-tab-2.html): its art, its name and
// one keyword, Current (worn now), Owned, or its price. The whole card is the
// button; it opens the look's popup, where it's bought or worn. Art is at 1
// CSS px per art pixel: a hero's 64px base build, or a backdrop cropped to the
// card around its floor.
defineProps<{ tile: SkinTile; state: SkinTileState; scene?: boolean }>();
defineEmits<{ pick: [] }>();
</script>

<template>
  <button type="button" class="skin-card" :class="{ scene, current: state === 'worn' }" @click="$emit('pick')">
    <span class="skin-art"><img :src="tile.src" alt="" /></span>
    <strong class="shop-name">{{ tile.name }}</strong>
    <span v-if="state === 'worn'" class="skin-word current">Current</span>
    <span v-else-if="state === 'owned'" class="skin-word owned">Owned</span>
    <span v-else class="price" :class="{ short: state === 'short' }" :aria-label="`${tile.skin?.gems ?? 0} gems`">
      <StatIcon name="gems" :size="13" />{{ (tile.skin?.gems ?? 0).toLocaleString('en-US') }}
    </span>
  </button>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.skin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 8px 6px;
  border: 0;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.skin-art {
  display: grid;
  place-items: end center;
  width: 64px;
  height: 64px;
  overflow: hidden;
}

.skin-art img {
  width: 64px;
  height: 64px;
  max-width: none;
  image-rendering: pixelated;
}

.scene .skin-art {
  width: 100%;
  height: 96px;
}

.scene .skin-art img {
  width: 216px;
  height: 116px;
}

.shop-name {
  overflow-wrap: anywhere;
}

.skin-word,
.price {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
}

.skin-word {
  padding: 0 8px;
}
</style>
