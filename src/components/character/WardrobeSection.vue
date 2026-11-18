<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight, Gem, House, Shirt, Swords, UserRound } from 'lucide-vue-next';
import { shopGateOpen } from '../../game-engine';
import { useSkins } from '../../composables/useSkins';
import { useSkinTiles } from '../../composables/useSkinTiles';
import type { SkinTile } from '../../composables/useSkinTiles';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import SectionTitle from '../ui/SectionTitle.vue';

// The Hero tab's wardrobe (docs/mockups/wardrobe-inline.html, option A): the
// looks the account owns, under Stats, and nothing for sale. Tapping one wears
// it, so the pinned home base above changes at once. The hero's row is the
// class being played's (only it shows in the home base). Each slot's default
// is always owned, so no row is empty. Buying is the Shop's Looks side, one
// button away once Looks is open. Art is drawn at 1 CSS px per art pixel: heroes their 64px base
// build, backdrops 216 x 116 cropped to the tile, never scaled.
const skins = useSkins();
const { tilesFor, stateOf } = useSkinTiles();
const tabStore = useTabStore();
const characterStore = useCharacterStore();
const looksOpen = computed(() => shopGateOpen(characterStore.character, 'looks'));

const owned = (tiles: SkinTile[]) => tiles.filter((tile) => stateOf(tile) === 'worn' || stateOf(tile) === 'owned');

const groups = computed(() => [
  { kind: 'hero', title: 'Hero', icon: UserRound, tiles: owned(tilesFor(skins.heroClass.value)) },
  { kind: 'home', title: 'Home', icon: House, tiles: owned(tilesFor('home')) },
  { kind: 'arena', title: 'Arena', icon: Swords, tiles: owned(tilesFor('arena')) },
]);
const lookCount = computed(() => groups.value.reduce((count, group) => count + group.tiles.length, 0));

function wear(tile: SkinTile) {
  if (stateOf(tile) === 'owned') skins.wear(tile.slot, tile.skin?.id ?? null);
}

function shopLooks() {
  tabStore.selectShopSide('vault');
  tabStore.select('shop');
}
</script>

<template>
  <section id="wardrobe" class="stat-group wardrobe">
    <div class="hero-page-header">
      <SectionTitle title="Wardrobe" :aside="`${lookCount} looks`"><Shirt :size="18" class="section-icon" /></SectionTitle>
    </div>
    <div v-for="group in groups" :key="group.kind" class="wardrobe-group" :class="`wardrobe-${group.kind}`">
      <h3 class="wardrobe-label"><component :is="group.icon" :size="14" aria-hidden="true" />{{ group.title }}</h3>
      <ul class="wardrobe-tiles" :class="group.kind === 'hero' ? 'heroes' : 'scenes'">
        <li v-for="tile in group.tiles" :key="tile.key">
          <button
            type="button"
            class="wardrobe-tile"
            :class="{ worn: stateOf(tile) === 'worn' }"
            :aria-pressed="stateOf(tile) === 'worn'"
            @click="wear(tile)"
          >
            <span class="wardrobe-art"><img :src="tile.src" alt="" /></span>
            <span class="wardrobe-name">{{ tile.name }}</span>
            <span class="wardrobe-state">{{ stateOf(tile) === 'worn' ? 'Worn' : 'Wear' }}</span>
          </button>
        </li>
      </ul>
    </div>
    <button v-if="looksOpen" type="button" class="primary-button wardrobe-more" @click="shopLooks">
      <Gem :size="18" class="wardrobe-gem" aria-hidden="true" />More looks in the Shop<ChevronRight :size="18" aria-hidden="true" />
    </button>
  </section>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
/* The home base's tap scrolls here; the scroll box's top padding is 14px. */
.wardrobe {
  scroll-margin-top: 14px;
}

.wardrobe-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wardrobe-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.wardrobe-tiles {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wardrobe-tiles.heroes {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wardrobe-tiles.scenes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wardrobe-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px 6px 9px;
  text-align: center;
  cursor: pointer;
}

.wardrobe-art {
  display: grid;
  place-items: end center;
  overflow: hidden;
}

.heroes .wardrobe-art {
  width: 76px;
  height: 72px;
}

.heroes .wardrobe-art img {
  width: 64px;
  height: 64px;
}

/* A backdrop at 1 CSS px per art pixel, cropped to the tile and held to its
   bottom (a 108-row one shows dark above). */
.scenes .wardrobe-art {
  width: 100%;
  height: 116px;
}

.scenes .wardrobe-art img {
  width: 216px;
  max-width: none;
  height: auto;
}

.wardrobe-art img {
  image-rendering: pixelated;
}

.wardrobe-name {
  overflow-wrap: anywhere;
}

.wardrobe-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
}
</style>
