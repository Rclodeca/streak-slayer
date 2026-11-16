<script setup lang="ts">
import { computed, ref } from 'vue';
import { Crosshair, House, Sword, Swords, WandSparkles } from 'lucide-vue-next';
import { HERO_CLASSES } from '../../game-engine';
import type { HeroClass } from '../../game-engine';
import { useSkins } from '../../composables/useSkins';
import { useSkinTiles } from '../../composables/useSkinTiles';
import type { SkinTile } from '../../composables/useSkinTiles';
import Modal from '../ui/Modal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import { baseSpriteUrl } from '../ui/spriteUrl';
import SkinCard from './SkinCard.vue';
import SkinPopup from './SkinPopup.vue';

// The Vault side (docs/mockups/vault-tab-2.html, A): looks, kept for good.
// The class being played first, under its own name, then Browse more (the
// other classes' faces) for their skins in a sheet; those are worn the next
// time that class is played. Then the home base and the arena. A card opens
// its popup, where it's bought or worn.
const skins = useSkins();
const { tilesFor, stateOf } = useSkinTiles();

const CLASS_NAME: Record<HeroClass, string> = { warrior: 'Warrior', cleric: 'Mage', ranger: 'Ranger' };
const CLASS_ICON = { warrior: Sword, cleric: WandSparkles, ranger: Crosshair } as const;

const heroClass = computed(() => skins.heroClass.value);
const others = computed(() => HERO_CLASSES.filter((heroClass) => heroClass !== skins.heroClass.value));
const othersLine = computed(() => others.value.map((heroClass) => CLASS_NAME[heroClass]).join(' · '));

const moreOpen = ref(false);
const picked = ref<SkinTile | null>(null);
const pickedOpen = computed({
  get: () => picked.value !== null,
  set: (open) => {
    if (!open) picked.value = null;
  },
});
</script>

<template>
  <div class="shop-wares shop-vault">
    <SectionTitle :title="CLASS_NAME[heroClass]"><component :is="CLASS_ICON[heroClass]" :size="20" class="section-icon" /></SectionTitle>
    <div class="skin-grid">
      <SkinCard v-for="tile in tilesFor(heroClass)" :key="tile.key" :tile="tile" :state="stateOf(tile)" @pick="picked = tile" />
    </div>
    <button type="button" class="skin-more" @click="moreOpen = true">
      <span class="skin-faces" aria-hidden="true">
        <span v-for="other in others" :key="other" class="skin-face"><img :src="baseSpriteUrl(`player/${other}`)" alt="" /></span>
      </span>
      Browse more<em>{{ othersLine }}</em>
    </button>

    <SectionTitle title="Home base"><House :size="20" class="section-icon" /></SectionTitle>
    <div class="skin-grid scenes">
      <SkinCard v-for="tile in tilesFor('home')" :key="tile.key" :tile="tile" :state="stateOf(tile)" scene @pick="picked = tile" />
    </div>

    <SectionTitle title="Arena"><Swords :size="20" class="section-icon" /></SectionTitle>
    <div class="skin-grid scenes">
      <SkinCard v-for="tile in tilesFor('arena')" :key="tile.key" :tile="tile" :state="stateOf(tile)" scene @pick="picked = tile" />
    </div>

    <Modal v-if="moreOpen" v-model="moreOpen" title="More heroes" sheet>
      <div class="shop-wares shop-vault">
        <p class="shop-note skin-hint">Worn the next time you play that class.</p>
        <template v-for="other in others" :key="other">
          <SectionTitle :title="CLASS_NAME[other]"><component :is="CLASS_ICON[other]" :size="20" class="section-icon" /></SectionTitle>
          <div class="skin-grid">
            <SkinCard v-for="tile in tilesFor(other)" :key="tile.key" :tile="tile" :state="stateOf(tile)" @pick="picked = tile" />
          </div>
        </template>
      </div>
    </Modal>
    <SkinPopup v-if="picked" v-model="pickedOpen" :tile="picked" />
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-wares {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.skin-grid.scenes {
  grid-template-columns: 1fr 1fr;
}

.skin-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.skin-faces {
  display: flex;
}

/* Each face is its sprite at 1 CSS px per art pixel, cropped to the head. */
.skin-face {
  width: 26px;
  height: 26px;
  overflow: hidden;
}

.skin-face + .skin-face {
  margin-left: -6px;
}

.skin-face img {
  width: 64px;
  height: 64px;
  max-width: none;
  margin: -6px 0 0 -19px;
  image-rendering: pixelated;
}

.skin-more em {
  font-style: normal;
}

.skin-hint {
  margin: 0;
}
</style>
