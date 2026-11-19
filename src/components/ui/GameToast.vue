<script setup lang="ts">
import { TOAST_MS, useToast } from '../../composables/useToast';
import StatIcon from './StatIcon.vue';

// The foot-of-screen note (useToast): the art, a name and what it did, a line
// draining along its foot, gone after a few seconds. On phones it sits just
// above the tab bar, clear of the home bar; it never takes a tap.
const { current } = useToast();
const baseUrl = import.meta.env.BASE_URL;
</script>

<template>
  <div class="game-toast-dock" aria-live="polite">
    <Transition name="game-toast">
      <div v-if="current" :key="current.key" class="game-toast" :style="{ '--tone': current.tone, '--toast-ms': `${TOAST_MS}ms` }">
        <img v-if="current.art" class="game-toast-art" :src="`${baseUrl}sprites/${current.art}.png`" alt="" />
        <StatIcon v-else-if="current.icon" class="game-toast-art game-toast-icon" :name="current.icon" :size="28" />
        <div class="game-toast-words">
          <strong class="game-toast-title">{{ current.title }}</strong>
          <span class="game-toast-text">{{ current.text }}</span>
        </div>
        <i class="game-toast-bar" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. Above the tab
   bar on phones (its 58px tabs, its foot padding and border), low and centred
   on wider screens. */
.game-toast-dock {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(58px + max(14px, env(safe-area-inset-bottom, 0px)) + 1px + 12px);
  z-index: 60;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

@media (min-width: 768px) {
  .game-toast-dock {
    bottom: 24px;
  }
}

.game-toast {
  position: relative;
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 10px 8px;
}

/* A stat icon stands in the art's square. */
.game-toast-icon {
  display: grid;
  place-items: center;
}

/* The 32x32 art at 1.5 CSS px per art pixel (3 device px on 2x), like the shop rows' rack size. */
.game-toast-art {
  width: var(--rack-art);
  height: var(--rack-art);
  flex: none;
  image-rendering: pixelated;
}

.game-toast-words {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.game-toast-bar {
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 3px;
  height: 2px;
  background: var(--tone);
  transform-origin: left;
  animation: game-toast-drain var(--toast-ms) linear forwards;
}

@keyframes game-toast-drain {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.game-toast-enter-active,
.game-toast-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.game-toast-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.game-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .game-toast-enter-from,
  .game-toast-leave-to {
    transform: none;
  }
}
</style>
