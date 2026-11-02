<script setup lang="ts">
import { computed } from 'vue';
import { formatCompact } from '../../game-engine';
import type { DamageType } from '../../game-engine';
import StatIcon from '../ui/StatIcon.vue';
import { DAMAGE_TYPE_ICON } from '../ui/statIcons';

// A skill's damage as the button that strikes it: the type's icon and the
// number on a raised face over a 3px lip (docs/mockups/pixel-done.html,
// option A). Pressing drops the face onto the lip; struck, it stays down and
// goes grey until the period ends. Resting, it's flat and can't be pressed.
// A struck Overdrive skill with charges left stays tappable. The type
// colour comes from the row's --c.
const props = defineProps<{
  damageType: DamageType;
  damage: number;
  state: 'open' | 'struck' | 'resting';
  resist?: boolean;
  overdrive?: boolean;
  lit?: boolean;
  label: string;
}>();
const emit = defineEmits<{ strike: [] }>();

const disabled = computed(() => props.state === 'resting' || (props.state === 'struck' && !props.overdrive));
</script>

<template>
  <button
    type="button"
    class="strike"
    :class="[state, { resist, 'overdrive-ready': overdrive, lit }]"
    :data-type="damageType"
    :aria-label="label"
    :aria-pressed="state === 'struck'"
    :disabled="disabled"
    @click.stop="emit('strike')"
  >
    <span class="face"><StatIcon :name="DAMAGE_TYPE_ICON[damageType]" :size="13" /><b>{{ formatCompact(damage) }}</b></span>
  </button>
</template>

<style scoped>
/* The button is 44px tall for the tap; the face and its lip, 37px, sit in
   it. The negative margin keeps the card about 52px tall. */
.strike {
  --lip: 3px;
  --face: color-mix(in srgb, var(--c) 88%, #000);
  --base: color-mix(in srgb, var(--c) 36%, #000);
  --flash: var(--face);
  --ink: #fff;
  --ink-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
  --bevel: inset 0 2px 0 rgba(255, 255, 255, 0.28), inset 2px 0 0 rgba(255, 255, 255, 0.12), inset 0 -2px 0 rgba(0, 0, 0, 0.25),
    inset -2px 0 0 rgba(0, 0, 0, 0.15);
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 44px;
  margin: -3.5px 0;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  font: 700 14.5px/1 var(--sans, system-ui, sans-serif);
  font-variant-numeric: lining-nums tabular-nums;
  -webkit-tap-highlight-color: transparent;
}

.face {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  width: 76px;
  height: calc(34px + var(--lip));
  padding: 0 6px var(--lip);
  color: var(--ink);
  text-shadow: var(--ink-shadow);
}

.face::before,
.face::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  clip-path: var(--px2);
}

/* The lip. */
.face::before {
  top: var(--lip);
  bottom: 0;
  background: var(--base);
}

/* The face, with pixel highlights: light top and left, dark bottom and right. */
.face::after {
  top: 0;
  bottom: var(--lip);
  background: var(--face);
  box-shadow: var(--bevel);
  transition:
    top 0.07s,
    bottom 0.07s;
}

.face > * {
  position: relative;
  z-index: 1;
  transition: transform 0.07s;
}

.face b {
  font-weight: inherit;
}

.face .stat-icon {
  color: inherit;
}

/* Pressed: the face sits on the lip. */
.strike:active .face::after,
.strike:is(.struck, .resting) .face::after {
  top: var(--lip);
  bottom: 0;
}

.strike:active .face > *,
.strike:is(.struck, .resting) .face > * {
  transform: translateY(var(--lip));
}

/* True damage's pale face takes dark text. */
.strike.open[data-type='trueDamage'] {
  --ink: #1e1c18;
  --ink-shadow: none;
}

/* Resist: a dark face on a red lip, the number tinted red. */
.strike.resist {
  --flash: var(--damage-color);
}

.strike.resist.open {
  --face: var(--resist-face);
  --base: color-mix(in srgb, var(--damage-color) 55%, #000);
  --ink: color-mix(in srgb, var(--damage-color) 72%, #fff);
  --ink-shadow: none;
  --bevel: inset 0 2px 0 rgba(255, 255, 255, 0.08);
}

/* Struck: every trace of colour goes. */
.strike.struck {
  --face: var(--struck-face);
  --base: var(--struck-lip);
  --ink: var(--struck-ink);
  --ink-shadow: none;
  --bevel: none;
}

/* Resting: flat, no lip, a dim number. */
.strike.resting {
  --face: var(--resting-face);
  --base: transparent;
  --ink: color-mix(in srgb, var(--c) 45%, var(--spent-text));
  --ink-shadow: none;
  --bevel: inset 0 0 0 2px rgba(255, 255, 255, 0.04);
}

/* A spent or resting button lets the tap fall through to the card, which
   opens the skill's details. */
.strike:disabled {
  cursor: default;
  pointer-events: none;
}

/* Landing: the face flashes its type colour (red for Resist) as it goes
   down, then fades to grey. */
.strike.lit .face::after {
  animation: strike-land 0.6s ease-out;
}

@keyframes strike-land {
  from {
    background: var(--flash);
  }
}

.strike:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .strike.lit .face::after {
    animation: none;
  }

  .face::after,
  .face > * {
    transition: none;
  }
}
</style>
