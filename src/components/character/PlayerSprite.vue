<script setup lang="ts">
// The player's hero art: one of three FreePixel heroes (see CREDITS.md),
// picked from the run's rolled starting stats by heroClassFor — a warrior
// for a physical lean, a cleric for a magic lean, a ranger for an even
// split. Equipped gear shows in the details' Equipment list, not on the sprite.

import { computed } from 'vue';
import { heroClassFor } from '../../game-engine';
import type { Character } from '../../game-engine';
import { spriteUrl } from '../ui/spriteUrl';
import { HERO_CANVAS } from './heroArt';

const props = defineProps<{ character: Character }>();

const heroClass = computed(() => heroClassFor(props.character));
</script>

<template>
  <div class="player-sprite" :style="{ '--hero-canvas': `${HERO_CANVAS[heroClass]}px` }">
    <img class="hero" :src="spriteUrl(`player/${heroClass}`)" alt="Player" />
  </div>
</template>

<style scoped>
.player-sprite {
  position: relative;
  width: 96px;
  height: 96px;
}

.hero {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
</style>
