<script setup lang="ts">
import { computed } from 'vue';
import type { HeroClass } from '../../game-engine';
import { useSkins } from '../../composables/useSkins';
import { useSkinTiles } from '../../composables/useSkinTiles';
import type { SkinTile } from '../../composables/useSkinTiles';
import { useAccountStore } from '../../store/accountStore';
import Modal from '../ui/Modal.vue';
import ShopBuyButton from './ShopBuyButton.vue';

// A look, large, before it's bought or worn (docs/mockups/vault-tab-2.html):
// skins are the dear buys, so each one asks first. Not owned: Cancel or Buy
// (greyed, with the shortfall, when too dear). Owned: Wear, unless it's
// another class's, which is worn the next time that class is played.
// Current: just Close. A hero is drawn at 3 CSS px per art pixel (its 64px
// base build at 192px), a backdrop scaled to the popup's width, whole.
const props = defineProps<{ modelValue: boolean; tile: SkinTile }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const accountStore = useAccountStore();
const skins = useSkins();
const { stateOf } = useSkinTiles();

const CLASS_NAME: Record<HeroClass, string> = { warrior: 'Warrior', cleric: 'Mage', ranger: 'Ranger' };
const scene = computed(() => props.tile.slot === 'home' || props.tile.slot === 'arena');
const state = computed(() => stateOf(props.tile));
const theirs = computed(() => !scene.value && props.tile.slot !== skins.heroClass.value);
const line = computed(() => {
  if (props.tile.slot === 'home') return 'Your Hero tab backdrop.';
  if (props.tile.slot === 'arena') return 'Where you fight.';
  const name = CLASS_NAME[props.tile.slot as HeroClass];
  return theirs.value ? `${name} skin. Worn on your next ${name} run.` : `${name} skin.`;
});
const price = computed(() => props.tile.skin?.gems ?? 0);
const shortfall = computed(() => (state.value === 'short' ? price.value - accountStore.account.gems : 0));

function close() {
  emit('update:modelValue', false);
}
function buy() {
  if (props.tile.skin && skins.buy(props.tile.skin.id)) close();
}
function wear() {
  if (skins.wear(props.tile.slot, props.tile.skin?.id ?? null)) close();
}
</script>

<template>
  <Modal :model-value="modelValue" max-width="380px" @update:model-value="emit('update:modelValue', $event)">
    <div class="skin-popup" :class="{ scene }">
      <div class="skin-stage">
        <span v-if="state === 'worn'" class="skin-word current">Current</span>
        <span v-else-if="state === 'owned'" class="skin-word owned">Owned</span>
        <img :src="tile.src" alt="" />
      </div>
      <div class="skin-body">
        <strong class="shop-name">{{ tile.name }}</strong>
        <p class="skin-line">{{ line }}</p>
        <p v-if="shortfall > 0" class="shop-warn">{{ shortfall.toLocaleString('en-US') }} more gems needed.</p>
        <div class="skin-acts" :class="{ one: state === 'worn' || (state === 'owned' && theirs) }">
          <button type="button" class="skin-close" @click="close">{{ state === 'buy' || state === 'short' ? 'Cancel' : 'Close' }}</button>
          <ShopBuyButton v-if="state === 'buy' || state === 'short'" verb="Buy" :price="price" :buyable="state === 'buy'" :short="state === 'short'" currency="gems" @buy="buy" />
          <button v-else-if="state === 'owned' && !theirs" type="button" class="shop-buy skin-wear" @click="wear">Wear</button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.skin-stage {
  position: relative;
  display: grid;
  place-items: center;
  height: 210px;
  overflow: hidden;
}

.skin-stage img {
  width: 192px;
  height: 192px;
  max-width: none;
  image-rendering: pixelated;
}

.scene .skin-stage {
  display: block;
  height: auto;
}

/* The whole backdrop, scaled to the popup's width (not cropped). */
.scene .skin-stage img {
  display: block;
  width: 100%;
  height: auto;
}

.skin-stage .skin-word {
  position: absolute;
  z-index: 1;
  left: 10px;
  top: 10px;
  padding: 4px 8px;
}

.skin-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 2px 2px;
}

.skin-line,
.shop-warn {
  margin: 0;
}

.skin-acts {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 8px;
  margin-top: 10px;
}

.skin-acts.one {
  grid-template-columns: 1fr;
}

.skin-acts button {
  width: 100%;
  min-height: 44px;
}
</style>
