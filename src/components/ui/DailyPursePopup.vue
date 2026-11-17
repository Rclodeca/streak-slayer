<script setup lang="ts">
import { ref } from 'vue';
import { ChevronRight, Coins } from 'lucide-vue-next';
import { useCenteredArt } from '../../composables/useCenteredArt';
import { useDailyPurse } from '../../composables/useDailyPurse';
import { useModalPriority } from '../../composables/useModalPriority';
import Modal from './Modal.vue';

// The daily purse (docs/mockups/daily-login.html, option A): the shopkeeper's
// room across the top, the day's gold in a sunk well, and Claim. On the day a
// new service begins its turn, it rides along as a card that claims and opens
// Shop → Services. Shows before the Daily update (useModalPriority).
const { gold, newService, claim, claimAndVisitServices } = useDailyPurse();
const { purseVisible } = useModalPriority();
const baseUrl = import.meta.env.BASE_URL;

// The shop backdrop at 2 CSS px per art pixel, as on the Shop tab.
const ART_W = 432;
const ART_H = 232;
const strip = ref<HTMLElement | null>(null);
const offset = useCenteredArt(strip, ART_W);
</script>

<template>
  <Modal :model-value="purseVisible" :dismissible="false" max-width="420px">
    <div class="purse">
      <div ref="strip" class="purse-strip" :style="{ '--art-w': `${ART_W}px`, '--art-h': `${ART_H}px`, '--art-x': `${offset}px` }">
        <img class="purse-room" :src="`${baseUrl}sprites/home/shop.png`" alt="" />
        <h3 class="purse-title">A new day</h3>
      </div>

      <p class="purse-gold" :aria-label="`${gold} gold`">
        <Coins :size="30" aria-hidden="true" />
        <b>+{{ gold.toLocaleString('en-US') }}</b>
      </p>
      <p class="purse-line">The merchant leaves a purse at your door.</p>

      <button v-if="newService" type="button" class="purse-service" @click="claimAndVisitServices">
        <img :src="`${baseUrl}sprites/services/${newService.id}.png`" alt="" />
        <span class="purse-service-text">
          <small>New service</small>
          <strong>{{ newService.name }}</strong>
          <span>{{ newService.effect }}</span>
        </span>
        <ChevronRight :size="20" aria-hidden="true" />
      </button>

      <button type="button" class="claim primary-button" @click="claim"><Coins :size="18" aria-hidden="true" />Claim</button>
    </div>
  </Modal>
</template>

<style scoped>
/* The strip runs to the popup's edges and top, as on the level-up popup: past
   the scroll box's padding (1rem 1.25rem) and the empty header's gap (0.75rem). */
.purse-strip {
  position: relative;
  height: 120px;
  margin: calc(-1rem - 0.75rem) -1.25rem 0.9rem;
  overflow: hidden;
  background: #07080c;
  border-bottom: 3px solid var(--card-lip, #0e0e19);
}

/* Shifted up 24 art px, so the strip shows the shopkeeper and his counter. */
.purse-room {
  position: absolute;
  left: var(--art-x);
  top: -48px;
  width: var(--art-w);
  height: var(--art-h);
  max-width: none;
  image-rendering: pixelated;
}

/* Night behind the title, and a little at the foot. */
.purse-strip::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(8, 8, 17, 0.55), rgba(8, 8, 17, 0.1) 60%, rgba(8, 8, 17, 0.5));
  pointer-events: none;
}

.purse-title {
  position: absolute;
  z-index: 1;
  top: 14px;
  left: 1.25rem;
  margin: 0;
  font-family: var(--heading);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #f4f4fa;
}

/* The gold in a sunk well. */
.purse-gold {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 14px 0 12px;
  color: var(--icon-coin);
  background: var(--code-bg);
  clip-path: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  box-shadow: inset 2px 2px 0 var(--sunk-hi), inset -2px -2px 0 var(--sunk-lo);
}

.purse-gold b {
  font-family: var(--heading);
  font-size: 2.4rem;
  line-height: 1;
  text-shadow: 0 2px 0 #000;
  font-variant-numeric: tabular-nums;
}

.purse-line {
  margin: 8px 0 0;
  font-size: 0.875rem;
  text-align: center;
  color: var(--text);
}

/* A lifted card: the service's seal, its name and effect, and a way to it. */
.purse-service {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  margin-top: 12px;
  padding: 8px 10px;
  border: 0;
  text-align: left;
  color: var(--text);
  background: var(--card);
  clip-path: polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px));
  box-shadow: inset 2px 2px 0 var(--card-hi), inset -2px -2px 0 var(--card-lo);
  cursor: pointer;
}

/* The 32x32 seal at 2 CSS px per art pixel, as in the service popups. */
.purse-service img {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.purse-service-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.purse-service-text small {
  font-family: var(--heading);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--brass, var(--accent));
}

.purse-service-text strong {
  font-family: var(--serif);
  font-size: 0.95rem;
  color: var(--text-h);
}

.purse-service-text span {
  font-size: 0.8rem;
}

.purse-service svg {
  color: var(--moon, var(--accent));
}

.claim {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 1rem;
}
</style>
