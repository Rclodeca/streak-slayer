<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { heroClassFor } from '../../game-engine';
import { lockBodyScroll } from '../../composables/useBodyScrollLock';
import { useHoodedFigure } from '../../composables/useHoodedFigure';
import { useCharacterStore } from '../../store/characterStore';
import HoodedSpeech from './HoodedSpeech.vue';

// The hooded figure's scenes after a hero is named (his opening on the first
// run, a return line after a death), over the whole screen. The scene's lines
// and kind are set by `beginRun` (useCombatActions); tapping past the last
// line ends it. His death line plays inside DeathScreen instead.
const { scene, endScene } = useHoodedFigure();
const characterStore = useCharacterStore();
const heroClass = computed(() => heroClassFor(characterStore.character));

let releaseScrollLock: (() => void) | null = null;
function unlock() {
  releaseScrollLock?.();
  releaseScrollLock = null;
}
watch(
  () => scene.value !== null,
  (open) => {
    if (open && !releaseScrollLock) releaseScrollLock = lockBodyScroll();
    else if (!open) unlock();
  },
  { immediate: true },
);
onBeforeUnmount(unlock);
</script>

<template>
  <Teleport to="body">
    <div v-if="scene" class="scene-layer">
      <HoodedSpeech :lines="scene.lines" :kind="scene.kind" :hero-class="heroClass" @done="endScene" />
    </div>
  </Teleport>
</template>

<style scoped>
/* Above every popup (Modal is 1000). */
.scene-layer {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  background: #0b0d14;
}

.scene-layer > * {
  flex: 1;
}
</style>
