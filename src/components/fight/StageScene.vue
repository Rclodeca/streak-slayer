<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Personality } from '../../game-engine';
import { useDebugBackdropStore } from '../../store/debugBackdropStore';
import { useThemeStore } from '../../store/themeStore';
import { createPainter, FRAME_W } from './stage/painter';
import type { Fit } from './stage/painter';
import { STAGE_SCENES } from './stage/scenes';
import { sceneMotion } from './stage/sceneFx';

// The boss's place behind the fight (stage/scenes.ts), on two canvases: the scene,
// painted whenever the boss or the stage's size changes, and its motion,
// stepped about 12 times a second. An art pixel is 2 CSS px on a phone and 3 on the
// desktop banner, whose sprites are drawn half again as large. The scene's frame is
// fitted to the stage by where the plinths stand (in the Focus strip, which has
// none, by the sprites), so each fighter keeps its backdrop at any width.

const props = defineProps<{ personality: Personality }>();

const themeStore = useThemeStore();
// Testing: the debug menu can swap the painted scene for the generated arena.
const debugBackdrop = useDebugBackdropStore();
const arena = computed(() => (debugBackdrop.stage === 'painted' ? null : debugBackdrop.stage));
const baseUrl = import.meta.env.BASE_URL;
const root = ref<HTMLElement | null>(null);
const art = ref<HTMLCanvasElement | null>(null);
const fx = ref<HTMLCanvasElement | null>(null);

// Where the frame has the fighters (see scenes.ts): the boss's and hero's plinths
// centred on these columns, the boss's plinth top and its sprite's foot on these rows.
const FRAME_BOSS_X = 143;
const FRAME_HERO_X = 37;
const FRAME_PLINTH_TOP = 65;
const FRAME_SPRITE_FOOT = 71;
const STEP_MS = 83;

/** An element's box in the stage's own coordinates, ignoring transforms (a boss
 *  mid-arrival still fits the scene to where it will stand). */
function boxIn(el: HTMLElement, stage: HTMLElement) {
  let x = 0, y = 0;
  for (let e: HTMLElement | null = el; e && e !== stage; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function fitFrame(stage: HTMLElement, px: number): Fit {
  const find = (sel: string) => stage.querySelector<HTMLElement>(sel);
  const bossPlat = find('.boss-plat'), heroPlat = find('.hero-plat');
  if (bossPlat?.offsetWidth && heroPlat?.offsetWidth) {
    const b = boxIn(bossPlat, stage), h = boxIn(heroPlat, stage);
    return {
      dxL: Math.round((h.x + h.w / 2) / px - FRAME_HERO_X),
      dxR: Math.round((b.x + b.w / 2) / px - FRAME_BOSS_X),
      oy: Math.round(b.y / px - FRAME_PLINTH_TOP),
    };
  }
  const bossSprite = find('.boss-figure img'), heroSprite = find('.hero-figure img');
  if (bossSprite?.offsetWidth && heroSprite?.offsetWidth) {
    const b = boxIn(bossSprite, stage), h = boxIn(heroSprite, stage);
    return {
      dxL: Math.round((h.x + h.w / 2) / px - FRAME_HERO_X),
      dxR: Math.round((b.x + b.w / 2) / px - FRAME_BOSS_X),
      oy: Math.round((b.y + b.h) / px - FRAME_SPRITE_FOOT),
    };
  }
  return { dxL: 0, dxR: Math.round(stage.clientWidth / px) - FRAME_W, oy: 0 };
}

const matches = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

let painting = 0;
let looping = 0;
let visible = true;
let step: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let visibleObserver: IntersectionObserver | null = null;

function paint() {
  painting = 0;
  const el = root.value, canvas = art.value, layer = fx.value, stage = el?.closest<HTMLElement>('.fight-stage');
  // jsdom has no canvas to paint on.
  if (!el || !canvas || !layer || !stage || typeof ImageData === 'undefined') return;
  const ctx = canvas.getContext('2d'), fxCtx = layer.getContext('2d');
  const px = matches('(min-width: 821px)') ? 3 : 2;
  const cols = Math.ceil(el.clientWidth / px), rows = Math.ceil(el.clientHeight / px);
  if (!ctx || !fxCtx || !cols || !rows) return;

  const fit = fitFrame(stage, px), scene = STAGE_SCENES[props.personality];
  const g = createPainter(cols, rows, fit);
  const data = scene.paint(g) ?? {};
  for (const c of [canvas, layer]) {
    c.width = cols;
    c.height = rows;
    c.style.width = `${cols * px}px`;
    c.style.height = `${rows * px}px`;
  }
  ctx.putImageData(new ImageData(new Uint8ClampedArray(g.buf.buffer), cols, rows), 0, 0);

  // The motion: its own layer.
  const m = createPainter(cols, rows, fit), image = new ImageData(new Uint8ClampedArray(m.buf.buffer), cols, rows);
  const draw = sceneMotion(scene.fx, m, data, 100);
  let t = 0;
  step = () => {
    t++;
    m.buf.fill(0);
    draw(t);
    fxCtx.putImageData(image, 0, 0);
  };
  step();
  loop();
}

function schedule() {
  if (!painting) painting = requestAnimationFrame(paint);
}

// Steps the motion while the stage is on screen; held still for reduced motion.
function loop() {
  cancelAnimationFrame(looping);
  looping = 0;
  if (!step || !visible || matches('(prefers-reduced-motion: reduce)')) return;
  let last = 0;
  const tick = (now: number) => {
    looping = requestAnimationFrame(tick);
    if (now - last < STEP_MS) return;
    last = now;
    step?.();
  };
  looping = requestAnimationFrame(tick);
}

watch(() => [props.personality, themeStore.theme], schedule);

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(root.value);
  }
  if (typeof IntersectionObserver !== 'undefined' && root.value) {
    visibleObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      loop();
    });
    visibleObserver.observe(root.value);
  }
  schedule();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  visibleObserver?.disconnect();
  cancelAnimationFrame(painting);
  cancelAnimationFrame(looping);
  step = null;
});
</script>

<template>
  <div ref="root" class="stage-scene" aria-hidden="true">
    <img v-if="arena" class="arena-img" :src="`${baseUrl}sprites/stage/${arena}.png`" alt="" />
    <canvas v-show="!arena" ref="art" />
    <canvas v-show="!arena" ref="fx" />
  </div>
</template>

<style scoped>
.stage-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Sized in whole art pixels by StageScene; the last row may run past the edge. */
.stage-scene canvas {
  position: absolute;
  top: 0;
  left: 0;
  image-rendering: pixelated;
}

/* Held to the stage's bottom, under the fighters, so their feet land on the
   same rows on every phone: arena6b is 216 x 116, the backdrop's full height
   with no status-bar inset; with one, the dark behind it fills the top.
   2 CSS px per art pixel; height follows. */
.arena-img {
  position: absolute;
  bottom: 0;
  left: calc(50% - 216px);
  width: 432px;
  height: auto;
  image-rendering: pixelated;
}
</style>

<style>
/* The arena has its own floor: no plinths over it. */
.fight-stage:has(.arena-img) .boss-plat,
.fight-stage:has(.arena-img) .hero-plat {
  display: none;
}
.fight-stage:has(.arena-img) .stage-bg {
  background: #0b1019;
}

/* With no plinth to stand on, the boss stands a little lower on the arena's
   floor, 8px (4 art rows) below where the plinth held it (BossPanel.vue). */
@media (max-width: 820px) {
  .fight-stage:has(.arena-img) .boss-figure {
    bottom: calc(164px - 116 * var(--u));
  }
}
</style>
