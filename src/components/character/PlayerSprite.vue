<script setup lang="ts">
// The player's hero art: one of three FreePixel heroes (see CREDITS.md),
// picked from the run's rolled starting stats by heroClassFor — a warrior
// for a physical lean, a cleric for a magic lean, a ranger for an even
// split. Equipped gear shows in the details' Equipment list, not on the sprite.

import { computed } from 'vue';
import { heroClassFor } from '../../game-engine';
import type { Character } from '../../game-engine';
import { baseSpriteUrl, PHONE_STAGE_MEDIA, spriteUrl } from '../ui/spriteUrl';
import { HERO_CANVAS } from './heroArt';

// `stage`: on the fight stage, where phones draw the base build (see
// PHONE_STAGE_MEDIA).
const props = defineProps<{ character: Character; stage?: boolean }>();

const heroClass = computed(() => heroClassFor(props.character));
</script>

<template>
  <div class="player-sprite" :style="{ '--hero-canvas': `${HERO_CANVAS[heroClass]}px` }">
    <picture>
      <source v-if="stage" :media="PHONE_STAGE_MEDIA" :srcset="baseSpriteUrl(`player/${heroClass}`)" />
      <img class="hero" :src="spriteUrl(`player/${heroClass}`)" alt="Player" />
    </picture>
  </div>
</template>

<style scoped>
.player-sprite {
  position: relative;
  width: 96px;
  height: 96px;
}

picture {
  display: contents;
}

.hero {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
</style>
