<script setup lang="ts">
import { computed, ref } from 'vue';
import { characterGold } from '../../game-engine';
import { useCenteredArt } from '../../composables/useCenteredArt';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import CurrencyChips from '../ui/CurrencyChips.vue';

// The phone's Shop tab banner (docs/mockups/shop-tab-2.html, B's scene): the
// shopkeeper's room, pinned at the top where the fight stage would be, with
// the purse on a plate top-left and his line in an RPG text box across the
// foot, his name in its corner. The Vault side cools the room to blue. The
// shopkeeper is in the art, so nothing is drawn over him. The page's menu
// rides in its corner through the default slot, as on the stage and HomeBase.
//
// The art is the standard backdrop size, 216 x 116 art px, drawn at 2 CSS px
// per art pixel (432 x 232) and centred like HomeBase's armory.
const baseUrl = import.meta.env.BASE_URL;
const ART_W = 432;
const ART_H = 232;

const LINES = { shop: 'Back again? Still breathing, I see.', vault: 'Gems. Not yet.' } as const;

const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const tabStore = useTabStore();
const gold = computed(() => characterGold(characterStore.character));
const vaulted = computed(() => tabStore.shopSide === 'vault');

const frame = ref<HTMLElement | null>(null);
const offset = useCenteredArt(frame, ART_W);
</script>

<template>
  <section class="shop-scene" :class="{ vaulted }" aria-label="Shop">
    <div ref="frame" class="shop-crop" :style="{ '--art-w': `${ART_W}px`, '--art-h': `${ART_H}px`, '--art-x': `${offset}px` }">
      <div class="shop-art">
        <img class="shop-room" :src="`${baseUrl}sprites/home/shop.png`" alt="" />
        <span class="shop-tint" aria-hidden="true" />
      </div>
      <span class="shop-purse plate"><CurrencyChips :gold="gold" :gems="accountStore.account.gems" show-zero /></span>
      <div class="shop-say" aria-live="polite">
        <span class="who">Shopkeeper</span>
        <p :key="tabStore.shopSide" class="line">{{ LINES[tabStore.shopSide] }}</p>
      </div>
    </div>
    <div class="stage-menu"><slot /></div>
  </section>
</template>

<style scoped>
/* Pinned like the stage and the home base: the top row of the phone's grid. The
   dark behind the art also fills the status bar's inset. */
.shop-scene {
  grid-column: 1 / -1;
  position: relative;
  z-index: 8;
  padding-top: env(safe-area-inset-top, 0px);
  background: #07080c;
  border-bottom: 3px solid var(--card-lip, #05060a);
  box-shadow: 0 10px 18px -8px rgba(0, 0, 0, 0.7);
}

.shop-crop {
  position: relative;
  height: var(--art-h);
  overflow: hidden;
}

.shop-art {
  position: absolute;
  top: 0;
  left: var(--art-x);
  width: var(--art-w);
  height: var(--art-h);
}

.shop-room {
  position: absolute;
  inset: 0;
  width: var(--art-w);
  height: var(--art-h);
  max-width: none;
  image-rendering: pixelated;
  transition: filter 0.3s;
}

/* The Vault's cold: a blue cast laid over the warm lantern light. */
.shop-tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(rgba(30, 70, 120, 0.45), rgba(10, 30, 60, 0.55));
  mix-blend-mode: color;
  transition: opacity 0.3s;
}

.vaulted .shop-tint {
  opacity: 1;
}

/* Dark plates and the text box, the same in every theme (the room is always night). */
.plate {
  position: absolute;
  z-index: 1;
  padding: 5px 10px;
  background: rgba(7, 8, 12, 0.88);
  box-shadow:
    inset 2px 2px 0 #333c52,
    inset -2px -2px 0 #0c0f15;
  clip-path: var(--px2, none);
  color: #f0f3f7;
}

.shop-purse {
  left: 12px;
  top: 12px;
}

.shop-say {
  position: absolute;
  z-index: 2;
  left: 29px;
  right: 29px;
  bottom: 8px;
  padding: 7px 11px 8px;
  background: rgba(9, 11, 17, 0.9);
  box-shadow:
    inset 2px 2px 0 #3a4560,
    inset -2px -2px 0 #05060a;
  clip-path: var(--px3, none);
}

.who {
  position: absolute;
  top: 6px;
  right: 11px;
  font-family: var(--heading);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #d2bb85;
}

.line {
  margin: 0;
  padding-right: 4.5rem;
  font-family: var(--serif);
  font-size: 0.94rem;
  font-weight: 600;
  line-height: 1.25;
  color: #f0f3f7;
  animation: say-pop 0.25s steps(3);
}

.line::after {
  content: '▾';
  margin-left: 6px;
  font-size: 0.7rem;
  color: #7d8190;
  animation: say-blink 1.2s steps(2) infinite;
}

@keyframes say-pop {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
}

@keyframes say-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .line,
  .line::after {
    animation: none;
  }

  .shop-tint,
  .shop-room {
    transition: none;
  }
}

/* The page's menu, over the corner (as on the fight stage). */
.stage-menu {
  position: absolute;
  z-index: 7;
  top: calc(6px + env(safe-area-inset-top, 0px));
  right: 0;
  padding-right: calc(2px + env(safe-area-inset-right, 0px));
}
</style>
