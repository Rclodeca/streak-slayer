<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { HeroClass } from '../../game-engine';
import { baseSpriteUrl } from './spriteUrl';

// The hooded figure's line box (docs/mockups/pixel-hooded-flow.html): his
// scene fills the screen, his words type out in a box below it. A tap finishes
// the line being typed, the next tap moves on, and after the last line the
// scene says `done`. `death` adds the red "You died" and lays the hero down.
const props = defineProps<{ lines: string[]; kind: 'intro' | 'death' | 'back'; heroClass: HeroClass }>();
const emit = defineEmits<{ done: [] }>();

const TYPE_MS = 42;

const index = ref(0);
const typed = ref(0);
const line = computed(() => props.lines[index.value] ?? '');
const finished = computed(() => typed.value >= line.value.length);

let timer: ReturnType<typeof setInterval> | undefined;

function stopTyping() {
  clearInterval(timer);
  timer = undefined;
}

function type() {
  stopTyping();
  typed.value = 0;
  // Reduced motion gets the whole line at once.
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.value = line.value.length;
    return;
  }
  timer = setInterval(() => {
    typed.value++;
    if (finished.value) stopTyping();
  }, TYPE_MS);
}

function advance() {
  if (!finished.value) {
    stopTyping();
    typed.value = line.value.length;
  } else if (index.value < props.lines.length - 1) {
    index.value++;
    type();
  } else {
    emit('done');
  }
}

const box = ref<HTMLButtonElement | null>(null);
onMounted(() => {
  type();
  box.value?.focus({ preventScroll: true });
});
onBeforeUnmount(stopTyping);
</script>

<template>
  <div class="figure" :class="kind" @click="advance">
    <div class="scene">
      <p v-if="kind === 'death'" class="died">You died</p>
      <img class="boss" :src="baseSpriteUrl('bosses/hooded')" alt="" draggable="false" />
      <img class="me" :src="baseSpriteUrl(`player/${heroClass}`)" alt="" draggable="false" />
      <div class="floor" />
    </div>
    <button ref="box" type="button" class="dlg">
      <span class="speaker">???</span>
      <span class="line" aria-hidden="true">{{ line.slice(0, typed) }}</span>
      <!-- The typing is for the eyes; a screen reader gets the whole line at once. -->
      <span class="whole">{{ line }}</span>
      <span class="next" :class="{ done: finished }" aria-hidden="true">▼</span>
      <span v-if="lines.length > 1" class="dots" aria-hidden="true">
        <i v-for="(_, n) in lines" :key="n" :class="{ on: n <= index }" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.figure {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: hidden;
  background: linear-gradient(#120a10, #171727 60%);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* The stage: the figure looms on the right, the hero stands (or lies) at the left. */
.scene {
  position: relative;
  flex: 1;
  min-height: 300px;
}

.scene::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(50% 40% at 62% 62%, rgba(171, 141, 216, 0.18), transparent 70%);
}

.death .scene::before {
  background: radial-gradient(50% 40% at 62% 62%, rgba(212, 87, 74, 0.25), transparent 70%);
}

/* The art is drawn on whole art pixels: the hero at 1 CSS px each, the figure at 2. */
.boss,
.me {
  position: absolute;
  image-rendering: pixelated;
}

.boss {
  left: 60%;
  bottom: 30px;
  width: 256px;
  height: 256px;
  transform: translateX(-50%);
  animation: loom 4s ease-in-out infinite;
}

.me {
  left: 70px;
  bottom: 30px;
  width: 112px;
  height: 112px;
  transform: translateX(-50%);
}

.death .me {
  left: 80px;
  bottom: 4px;
  transform: translateX(-50%) rotate(-90deg);
  filter: grayscale(1) brightness(0.45);
}

@keyframes loom {
  50% {
    transform: translateX(-50%) translateY(-4px);
  }
}

.floor {
  position: absolute;
  inset: auto 0 0;
  height: 34px;
  background: #19192b;
  box-shadow: inset 0 3px 0 #2f2f4e;
}

.died {
  position: absolute;
  inset: calc(64px + env(safe-area-inset-top)) 0 auto;
  margin: 0;
  color: var(--damage-color, #d4574a);
  font: 700 26px 'Cinzel', serif;
  letter-spacing: 0.2em;
  text-align: center;
  text-indent: 0.2em;
  text-shadow: 0 3px 0 #0f1018;
}

/* The line box: a silver frame cut with the same pixel corners as the popups. */
.dlg {
  position: relative;
  display: block;
  min-height: 130px;
  margin: -10px 10px calc(14px + env(safe-area-inset-bottom));
  padding: 22px 16px 16px;
  border: 0;
  clip-path: var(--px3);
  background: #11121b;
  box-shadow:
    inset 0 0 0 3px #c8d0dd,
    inset 0 0 0 5px #11121b,
    inset 0 0 0 6px #676895;
  color: var(--text-h);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.dlg:focus-visible {
  outline: 0;
  box-shadow:
    inset 0 0 0 3px #fff,
    inset 0 0 0 5px #11121b,
    inset 0 0 0 6px #676895;
}

.speaker {
  position: absolute;
  left: 14px;
  top: -1px;
  padding: 3px 10px;
  clip-path: var(--px2);
  background: #c8d0dd;
  color: #20202e;
  font: 600 10px 'Cinzel', serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.line {
  display: block;
  min-height: 54px;
  margin-top: 4px;
  font: 600 20px/1.35 'Alegreya', Georgia, serif;
}

/* Hidden, but still read aloud. */
.whole {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.next {
  position: absolute;
  right: 14px;
  bottom: 10px;
  color: var(--moon, #dbe2ee);
  font-size: 12px;
  opacity: 0;
}

.next.done {
  opacity: 1;
  animation: bob 0.7s steps(2) infinite;
}

@keyframes bob {
  50% {
    transform: translateY(3px);
  }
}

/* Which line of several this is. */
.dots {
  position: absolute;
  left: 16px;
  bottom: 12px;
  display: flex;
  gap: 5px;
}

.dots i {
  width: 5px;
  height: 5px;
  background: #414163;
}

.dots i.on {
  background: var(--moon, #dbe2ee);
}

@media (prefers-reduced-motion: reduce) {
  .boss,
  .next.done {
    animation: none;
  }
}
</style>
