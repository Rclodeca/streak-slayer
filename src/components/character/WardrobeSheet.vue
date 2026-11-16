<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { HERO_CLASSES } from '../../game-engine';
import type { HeroClass } from '../../game-engine';
import { useSkins } from '../../composables/useSkins';
import { useSkinTiles } from '../../composables/useSkinTiles';
import type { SkinTile } from '../../composables/useSkinTiles';
import ShopBuyButton from '../shop/ShopBuyButton.vue';
import Modal from '../ui/Modal.vue';

// Where skins are bought and worn (docs/ideas/2026-11-13-shop-economy.md §3):
// the hero's (by class, opening on the class being played), the home base's
// and the arena's. Each slot lists its default first, then its skins: worn,
// Wear, or a gem price. A buy is worn at once. Opened from the Hero tab's
// home base. Art is drawn at whole CSS px per art pixel: heroes 1 (their
// 64px base build), backdrops 1 (216 x 116).
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const skins = useSkins();
const { tilesFor, stateOf } = useSkinTiles();

const CLASS_NAME: Record<HeroClass, string> = { warrior: 'Warrior', cleric: 'Mage', ranger: 'Ranger' };
const shownClass = ref<HeroClass>(skins.heroClass.value);
watch(
  () => props.modelValue,
  (open) => {
    if (open) shownClass.value = skins.heroClass.value;
  },
);

const heroTiles = computed(() => tilesFor(shownClass.value));
const homeTiles = computed(() => tilesFor('home'));
const arenaTiles = computed(() => tilesFor('arena'));

const LABELS = { worn: 'Worn', owned: 'Wear' } as const;

function pick(tile: SkinTile) {
  const state = stateOf(tile);
  if (state === 'owned') skins.wear(tile.slot, tile.skin?.id ?? null);
  else if (state === 'buy' && tile.skin) skins.buy(tile.skin.id);
}

const groups = computed(() => [
  { kind: 'home', title: 'Home', tiles: homeTiles.value },
  { kind: 'arena', title: 'Arena', tiles: arenaTiles.value },
]);
</script>

<template>
  <Modal :model-value="modelValue" title="Wardrobe" max-width="520px" @update:model-value="emit('update:modelValue', $event)">
    <div class="wardrobe">
      <p class="picker-hint">New looks, bought with gems. Kept for good.</p>

      <section class="wardrobe-group wardrobe-hero">
        <h3 class="habit-group-title">Hero</h3>
        <div class="shop-switch wardrobe-classes" role="group" aria-label="Class">
          <button
            v-for="heroClass in HERO_CLASSES"
            :key="heroClass"
            type="button"
            class="shop-side"
            :class="{ selected: heroClass === shownClass }"
            :aria-pressed="heroClass === shownClass"
            @click="shownClass = heroClass"
          >
            {{ CLASS_NAME[heroClass] }}
          </button>
        </div>
        <ul class="wardrobe-tiles heroes">
          <li v-for="tile in heroTiles" :key="tile.key" class="wardrobe-tile" :class="{ worn: stateOf(tile) === 'worn' }">
            <span class="wardrobe-art"><img :src="tile.src" alt="" /></span>
            <strong class="shop-name">{{ tile.name }}</strong>
            <ShopBuyButton
              :price="tile.skin?.gems ?? 0"
              :buyable="stateOf(tile) === 'buy' || stateOf(tile) === 'owned'"
              :short="stateOf(tile) === 'short'"
              :label="LABELS[stateOf(tile) as keyof typeof LABELS]"
              currency="gems"
              @buy="pick(tile)"
            />
          </li>
        </ul>
      </section>

      <section v-for="group in groups" :key="group.kind" class="wardrobe-group" :class="`wardrobe-${group.kind}`">
        <h3 class="habit-group-title">{{ group.title }}</h3>
        <ul class="wardrobe-tiles scenes">
          <li v-for="tile in group.tiles" :key="tile.key" class="wardrobe-tile" :class="{ worn: stateOf(tile) === 'worn' }">
            <span class="wardrobe-art"><img :src="tile.src" alt="" /></span>
            <div class="wardrobe-foot">
              <strong class="shop-name">{{ tile.name }}</strong>
              <ShopBuyButton
                :price="tile.skin?.gems ?? 0"
                :buyable="stateOf(tile) === 'buy' || stateOf(tile) === 'owned'"
                :short="stateOf(tile) === 'short'"
                :label="LABELS[stateOf(tile) as keyof typeof LABELS]"
                currency="gems"
                @buy="pick(tile)"
              />
            </div>
          </li>
        </ul>
      </section>
    </div>
  </Modal>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.picker-hint {
  margin: 0 0 0.75rem;
}

.wardrobe-group {
  margin-top: 0.75rem;
}

.wardrobe-classes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  margin-bottom: 8px;
}

.wardrobe-classes button {
  min-height: 44px;
}

.wardrobe-tiles {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wardrobe-tiles.heroes {
  grid-template-columns: repeat(3, 1fr);
}

.wardrobe-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px;
  text-align: center;
}

.wardrobe-art {
  display: grid;
  place-items: end center;
  overflow: hidden;
}

.heroes .wardrobe-art {
  width: 72px;
  height: 72px;
}

.heroes .wardrobe-art img {
  width: 64px;
  height: 64px;
}

/* A backdrop at 1 CSS px per art pixel, held to the bottom (a 108-row one shows dark above). */
.scenes .wardrobe-art {
  width: 216px;
  max-width: 100%;
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

.wardrobe-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.heroes .shop-name {
  overflow-wrap: anywhere;
}
</style>
