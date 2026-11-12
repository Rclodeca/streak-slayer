<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { bossSkillMarks, effectiveStat, expToNextLevel, heroClassFor, PERSONALITY_NAME } from '../../game-engine';
import { useCelebration } from '../../composables/useCelebration';
import { setHitPlayer, useHitFeed } from '../../composables/useHitFeed';
import { useScrolledPast } from '../../composables/useScrolledPast';
import { useStageFocused } from '../../composables/useStageFocused';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import BossBar from '../boss/BossBar.vue';
import BossPanel from '../boss/BossPanel.vue';
import { bossSprite } from '../boss/bossSprites';
import CharacterPanel from '../character/CharacterPanel.vue';
import { createHitPlayer } from './hitFx';
import StageScene from './StageScene.vue';
import { STAGE_SCENES } from './stage/scenes';

// The fight as one scene: the boss and the hero square off across one stage,
// each half its own panel with its own details. Hits play out across it
// (hitFx.ts), each fighter's HP held back until its blow lands.
//
// On phones the stage holds the top of the screen while the lists scroll in
// their own box beneath it; Focus mode (the menu's), or the phone's Hero tab
// (STRIP_TABS), shrinks it to a 76px strip, the fighters at half size with
// only their names and bars. The page's menu rides
// in the stage's corner through the default slot, so it stays with the stage.
// Behind it all, the boss's own place (StageScene): a day scene turns the stage's
// names and stats to dark ink, and the plinths take the scene's stone. The Focus
// strip keeps the plain night instead: no scene.

const bossStore = useBossStore();
const characterStore = useCharacterStore();
const focused = useStageFocused();

// The slain boss stays up while a kill plays out, as on the stage.
const { phase, displayedBoss, heldLevel } = useCelebration();
const boss = computed(() => displayedBoss.value ?? bossStore.boss);
const scene = computed(() => STAGE_SCENES[boss.value.personality]);
const plinth = computed(() => {
  const [face, top, mid, foot] = scene.value.plinth;
  return { '--plinth': face, '--plinth-top': top, '--plinth-mid': mid, '--plinth-foot': foot };
});

// On desktop the banner scrolls away with the page, and BossBar (the Focus
// strip, the two HP bars side by side) drops in once the whole stage has gone
// (phones keep the stage pinned, so BossBar hides itself there). It carries
// the hero's HP, level and EXP too (the level and EXP held back like the hero
// panel's until a level-up's beat plays).
const hero = computed(() => characterStore.character);
const heroLevel = computed(() => heldLevel.value ?? hero.value.level);
const heroMax = computed(() => effectiveStat(hero.value, 'health'));
const heroExpMax = computed(() => expToNextLevel(heroLevel.value));
const heroExp = computed(() => (heldLevel.value === null ? hero.value.exp : heroExpMax.value));
const { shownHp } = useHitFeed();
const bossHp = computed(() => shownHp(boss.value.index, boss.value.health, boss.value.maxHealth));
const heroHp = computed(() => shownHp('hero', hero.value.currentHealth, heroMax.value));
const stage = ref<HTMLElement | null>(null);
const bar = ref<InstanceType<typeof BossBar> | null>(null);
const scrolledPast = useScrolledPast(stage, () => (bar.value?.$el as HTMLElement | undefined)?.offsetHeight ?? 0);

// Where the boss's and hero's blocks end on the stage, measured as drawn:
// their text grows with the system's text size, so the tap areas' step reads
// these to keep each block wholly on its own side (see .stage-inner's CSS).
const inner = ref<HTMLElement | null>(null);
const blockEdges = ref<Record<string, string>>({});
let blockObserver: ResizeObserver | null = null;

function measureBlocks() {
  const el = inner.value;
  const box = el?.getBoundingClientRect();
  const boss = el?.querySelector('.boss-block')?.getBoundingClientRect();
  const heroBlock = el?.querySelector('.hero-block')?.getBoundingClientRect();
  if (!box || !boss || !heroBlock || box.height === 0) return;
  blockEdges.value = { '--boss-bottom': `${boss.bottom - box.top}px`, '--hero-top': `${heroBlock.top - box.top}px` };
}

// A switch between the full stage and the strip plays out rather than
// jumping (FLIP): the stage's box eases to its new height, clipped meanwhile,
// and the fighters, their blocks and the menu glide from where they stood to
// where they now stand, the fighters scaling as they go. The backdrop, and
// what only the full stage shows, fade in. Transform and opacity only, bar the
// box's height, so it stays cheap on a phone.
const SHIFT = { duration: 280, easing: 'ease' };
const MOVERS = ['.boss-figure', '.hero-figure', '.boss-block', '.hero-block', '.stage-menu'];
const FADERS = ['.stage-bg', '.boss-plat', '.hero-plat', '.stat-summary'];
let shifting: Animation[] = [];
let shiftRun = 0;

function snapshot(el: HTMLElement) {
  return {
    height: el.getBoundingClientRect().height,
    margin: getComputedStyle(el).marginBottom,
    rects: MOVERS.map((sel) => el.querySelector(sel)?.getBoundingClientRect()),
  };
}

watch(focused, async () => {
  const el = stage.value;
  if (!el || typeof el.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  // Taken mid-glide if the last switch is still playing, so this one carries on from there.
  const from = snapshot(el);
  for (const animation of shifting) animation.cancel();
  shifting = [];
  const run = ++shiftRun;
  await nextTick();
  if (run !== shiftRun || !stage.value) return;
  const to = snapshot(el);
  const play = (node: Element, keyframes: Parameters<Element['animate']>[0]) => shifting.push(node.animate(keyframes, SHIFT));

  el.style.overflow = 'clip';
  play(el, [
    { height: `${from.height}px`, marginBottom: from.margin },
    { height: `${to.height}px`, marginBottom: to.margin },
  ]);
  shifting[0].onfinish = () => {
    if (run === shiftRun) el.style.overflow = '';
  };

  MOVERS.forEach((sel, i) => {
    const node = el.querySelector<HTMLElement>(sel);
    const [a, b] = [from.rects[i], to.rects[i]];
    if (!node || !a?.width || !b?.width) return;
    // A fighter scales about its centre; a block or the menu only moves, from its corner.
    const figure = sel.endsWith('figure');
    const scale = figure ? a.width / b.width : 1;
    const dx = figure ? a.left + a.width / 2 - (b.left + b.width / 2) : a.left - b.left;
    const dy = figure ? a.top + a.height / 2 - (b.top + b.height / 2) : a.top - b.top;
    const base = getComputedStyle(node).transform;
    const rest = base === 'none' ? '' : ` ${base}`;
    play(node, [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})${rest}` }, { transform: base }]);
  });

  for (const node of el.querySelectorAll(FADERS.join())) play(node, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }]);
});

const fxLayer = ref<HTMLElement | null>(null);
const FIGURES = { boss: ['.boss-figure', '.sprite'], hero: ['.hero-figure', '.player-sprite'] } as const;

onMounted(() => {
  blockObserver = new ResizeObserver(() => requestAnimationFrame(measureBlocks));
  for (const el of [inner.value, inner.value?.querySelector('.boss-block'), inner.value?.querySelector('.hero-block')]) {
    if (el) blockObserver.observe(el);
  }
  measureBlocks();

  const layer = fxLayer.value;
  const stageEl = inner.value;
  if (!layer || !stageEl) return;
  setHitPlayer(
    createHitPlayer({
      layer,
      stage: stageEl,
      fighter: (who) => {
        const [figureSel, bodySel] = FIGURES[who];
        const figure = stageEl.querySelector<HTMLElement>(figureSel);
        const body = figure?.querySelector<HTMLElement>(bodySel);
        return figure && body ? { figure, body } : null;
      },
    }),
  );
});
onBeforeUnmount(() => {
  for (const animation of shifting) animation.cancel();
  blockObserver?.disconnect();
  setHitPlayer(null);
});
</script>

<template>
  <section
    ref="stage"
    class="fight-stage"
    :class="{
      focus: focused,
      'day-stage': scene.day && !focused,
    }"
    :style="plinth"
  >
    <div class="stage-bg" aria-hidden="true"><StageScene v-if="!focused" :personality="boss.personality" /></div>
    <div ref="inner" class="stage-inner" :style="blockEdges">
      <BossPanel />
      <CharacterPanel />
      <div ref="fxLayer" class="fx-layer" aria-hidden="true" />
    </div>
    <div class="stage-menu"><slot /></div>

    <Teleport to="body">
      <BossBar
        ref="bar"
        :sprite="bossSprite(boss)"
        :name="PERSONALITY_NAME[boss.personality]"
        :boss-index="boss.index"
        :current="bossHp"
        :max="boss.maxHealth"
        :hero-class="heroClassFor(hero)"
        :hero-name="hero.name ?? 'Character'"
        :hero-current="heroHp"
        :hero-max="heroMax"
        :hero-level="heroLevel"
        :hero-exp="heroExp"
        :hero-exp-max="heroExpMax"
        :shown="scrolledPast"
        :phase="phase"
        :marks="bossSkillMarks(boss)"
      />
    </Teleport>
  </section>
</template>

<style scoped>
/* Frameless: on phones the stage runs edge to edge (its night sky), with
   the fighters held to a centred box no wider than a large phone. Clipped
   at the sides only, so a crit's jolt or a spark never scrolls the page
   sideways and the numbers can still rise off the top. */
.fight-stage {
  position: relative;
  overflow-x: clip;
  /* Its height is its content's, bar while a switch to or from the strip
     eases it (above): border-box, so that height takes in its padding. */
  box-sizing: border-box;
}

/* A little air under the plinths, so the hero's doesn't sit on the stage's
   edge. (The Focus strip has no plinths.) AppShell takes the same 4px off the
   gap below, so the lists stay where they were. */
.fight-stage:not(.focus) {
  padding-bottom: 4px;
}

/* The page's menu, over the stage's top-right corner and its tap areas. */
.stage-menu {
  position: absolute;
  z-index: 7;
  top: 0;
  right: 0;
}

/* Over the blocks, under the tap areas. */
.fx-layer {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.stage-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Drawn at 390px wide; on narrower phones --u shrinks the art in proportion
   while text and the blocks' insets keep their px (the blocks keep their
   share of the width, so they never cover the art). The stage starts at the
   top of the screen: the top bar's menu sits in its top-right corner
   (AppShell). The split is where the boss's and hero's tap areas meet, in a
   step that follows the diagonal; its left step rides the top of the hero,
   so a boss block that wraps deeper on a narrow phone stays on the boss's
   side, and its right step runs under the boss's plinth. Each step also
   gives way, 4px clear, to a block that reaches past it (--boss-bottom,
   --hero-top: measured, larger text). */
.stage-inner {
  position: relative;
  width: min(100%, 430px);
  height: calc(212px + var(--stage-grow, 0px));
  margin-inline: auto;
  container-type: inline-size;
  --u: min(1px, calc(100cqw / 390));
  --split-x: 50%;
  --split-yl: max(calc(212px + var(--stage-grow, 0px) - 118 * var(--u)), calc(var(--boss-bottom, 0px) + 4px));
  --split-yr: min(calc(54px + var(--stage-grow, 0px) + 116 * var(--u)), calc(var(--hero-top, 999px) - 4px));
  /* A second step, for the banner; on phones it folds into the first. */
  --split-x2: var(--split-x);
  --split-ym: var(--split-yr);
}

/* Phones: the top row of the screen, the lists scrolling in their own box
   beneath it (AppShell), so it never moves. Its backdrop is opaque, see the
   theme. Above the lists and their buttons, below the popups. */
@media (max-width: 820px) {
  /* The air above the names is the stage's own padding (plus the status bar's
     inset). */
  .fight-stage {
    --stage-top: calc(10px + env(safe-area-inset-top, 0px));
    z-index: 8;
    padding-top: var(--stage-top);
  }

  /* The button's 44px box holds only its icon, so it sits snug in the corner. Set
     from the full stage's top, not --stage-top, so the Focus strip's shorter
     top leaves it where it is. */
  .stage-menu {
    top: calc(6px + env(safe-area-inset-top, 0px));
    right: 6px;
  }

  /* Focus mode (below) is a 76px strip, which needs less air above it. The
     hero's name and level wait for room: their bar is stacked under the boss's
     here. */
  .fight-stage.focus {
    --stage-top: calc(4px + env(safe-area-inset-top, 0px));
  }

  .fight-stage.focus :deep(.hero-name),
  .fight-stage.focus :deep(.level-number) {
    display: none;
  }
}

/* Desktop and tablet: a wide banner across the content, the same diagonal
   stretched out with each fighter 7% in from its edge. The boss's tap area is
   the rectangle from its block's left edge to the right, down to 212px, less
   a notch under its block for the hero's name where the two blocks overlap
   on narrower screens (none once the hero's block ends left of the boss's). */
@media (min-width: 821px) {
  .stage-inner {
    width: 100%;
    height: 290px;
    --u: 1px;
    --split-x: calc(93% - 498px);
    --split-yl: 0px;
    --split-yr: 212px;
    --split-x2: max(var(--split-x), calc(7% + 450px));
    --split-ym: min(186px, calc(var(--hero-top, 999px) - 4px));
  }
}

/* Focus mode: a 76px strip. The hero stands left at half size, the boss
   right at half size clear of the menu (phones), and their names and bars run
   between: the boss's name over its bar at the top, the hero's bar below.
   The tap areas split across the middle. Art stays on the 2x grid: the base
   build at half size is one device pixel per art pixel. Desktop and tablet
   draw the same strip across the banner (scrolling away with it, BossBar
   dropping in after), the two bars side by side like BossBar's. */
.fight-stage.focus .stage-inner {
  height: 76px;
  --split-yl: 38px;
  --split-yr: 38px;
  --split-ym: 38px;
}

.fight-stage.focus :deep(.boss-panel) {
  --boss-w: calc(64 * var(--u));
}

.fight-stage.focus :deep(.boss-plat),
.fight-stage.focus :deep(.hero-plat),
.fight-stage.focus :deep(.stat-summary),
.fight-stage.focus :deep(.slain-name) {
  display: none;
}

.fight-stage.focus :deep(.name-line::after) {
  display: none;
}

/* Each fighter's art centred in the strip, in the room its side leaves: the boss
   between the bars' end and the menu button, the hero before the bars. */
.fight-stage.focus :deep(.boss-figure) {
  top: 6px;
  bottom: auto;
  right: 61px;
  width: calc(64 * var(--u));
  height: calc(64 * var(--u));
}

/* Fitted into its square, so not every pixel is whole: the strip's half-size
   fighters never were. */
.fight-stage.focus :deep(.boss-figure .sprite) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.fight-stage.focus :deep(.hero-figure) {
  left: 8px;
  bottom: 13px;
  width: calc(64 * var(--u));
}

.fight-stage.focus :deep(.boss-block) {
  top: 6px;
  left: 80px;
  gap: 3px;
  width: calc(100% - 152px - 64 * var(--u));
}

.fight-stage.focus :deep(.hero-block) {
  bottom: 12px;
  left: 80px;
  right: auto;
  gap: 0;
  width: calc(100% - 152px - 64 * var(--u));
}

.fight-stage.focus :deep(.slain-word) {
  font-size: 1.1rem;
}

@media (min-width: 821px) {
  /* The tap areas split down the middle, the boss on the right. */
  .fight-stage.focus .stage-inner {
    --split-x: 50%;
    --split-x2: 50%;
    --split-yl: 0px;
    --split-yr: 76px;
    --split-ym: 76px;
  }

  /* The boss stays clear of the menu in the stage's corner; the hero's bar
     takes the left half, the boss's the right, one row, their names above. */
  .fight-stage.focus :deep(.boss-figure) {
    right: 64px;
  }

  .fight-stage.focus :deep(.hero-figure) {
    left: 18px;
  }

  .fight-stage.focus :deep(.hero-block),
  .fight-stage.focus :deep(.boss-block) {
    top: 19px;
    bottom: auto;
    gap: 5px;
  }

  .fight-stage.focus :deep(.hero-block) {
    left: 88px;
    width: calc(50% - 95px);
  }

  .fight-stage.focus :deep(.boss-block) {
    left: calc(50% + 7px);
    width: calc(50% - 149px);
  }
}
</style>

<style>
/* The pieces hitFx.ts lays on .fx-layer, made outside Vue's templates so
   unscoped. Each takes its colour from --c. */
.fx-layer .fx {
  position: absolute;
  display: block;
  pointer-events: none;
}

.fx-streak {
  background: linear-gradient(90deg, transparent, var(--c), #fff, var(--c), transparent);
  box-shadow: 0 0 12px var(--c);
}

.fx-spark {
  border-radius: 2px;
  background: linear-gradient(#fff, var(--c));
}

.fx-orb {
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 25%, var(--c) 55%, transparent 72%);
  box-shadow: 0 0 16px 3px color-mix(in srgb, var(--c) 55%, transparent);
}

.fx-ring {
  border-radius: 50%;
  border: 2px solid var(--c);
  box-shadow:
    0 0 10px var(--c),
    inset 0 0 10px var(--c);
}

.fx-mote {
  border-radius: 50%;
  background: #f0ffe6;
  box-shadow: 0 0 8px 2px var(--c);
}

.fx-beam {
  --soft: color-mix(in srgb, var(--c) 55%, transparent);
  background: linear-gradient(90deg, transparent, var(--soft) 30%, #fff 50%, var(--soft) 70%, transparent);
  box-shadow: 0 0 26px var(--soft);
}

.fx-layer .fx-wash {
  inset: 0;
  background: radial-gradient(ellipse 55% 75% at var(--x) var(--y), #fff, transparent 75%);
}

/* Lifesteal: a red thread, life running along it in green. */
.fx-thread {
  transform-origin: 0 50%;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--fx-lifesteal) 15%, transparent),
    var(--fx-lifesteal) 50%,
    color-mix(in srgb, var(--fx-lifesteal) 15%, transparent)
  );
  box-shadow: 0 0 8px color-mix(in srgb, var(--fx-lifesteal) 60%, transparent);
}

.fx-pulse {
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 25%, var(--dmg-healing) 55%, transparent 72%);
}

/* The numbers: outlined to read over the sprites' busy pixels. */
.fx-pop {
  position: absolute;
  color: var(--c);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000,
    0 1px 3px rgba(0, 0, 0, 0.8);
}

.fx-pop.crit {
  font-size: 2rem;
}

.fx-pop.small {
  font-size: 1.2rem;
}
</style>
