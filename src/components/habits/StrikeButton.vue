<script setup lang="ts">
import { computed } from 'vue';
import type { DamageType } from '../../game-engine';

// A skill's check box, at the card's left edge (docs/mockups/habit-checkbox-b.html,
// B2): a pixel box rimmed in the type colour from the row's --c. Checking it
// strikes; the box flashes its colour, then settles grey with a check until the
// period ends. Resting, it's flat and can't be checked. A struck Overdrive skill
// with charges left stays tappable, haloed. A bad habit's box is rimmed red, and
// checking it means giving in: it fills with a cross.
const props = defineProps<{
  damageType: DamageType;
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
    <span class="box">
      <svg v-if="resist" class="mark" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
        <path d="M2 2h2v1h1v1h1V3h1V2h2v2H8v1H7v1h1v1h1v2H7V8H6V7H5v1H4v1H2V7h1V6h1V5H3V4H2z" />
      </svg>
      <svg v-else class="mark" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
        <path d="M1 5h2v1h1v1h1V6h1V5h1V4h1V3h1v2H8v1H7v1H6v1H5v1H3V8H2V7H1z" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
/* The button is 44px for the tap; the 30px box sits in it. The negative
   margin keeps the card 58px tall. */
.strike {
  --rim: color-mix(in srgb, var(--c) 85%, #000);
  --well: color-mix(in srgb, var(--c) 10%, var(--field, #141523));
  --flash: var(--c);
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -2px 0;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

/* The box: a sunk well with a type-coloured rim, shaded at the top like a hole. */
.box {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  clip-path: var(--px2);
  background: var(--well);
  box-shadow:
    inset 0 0 0 2px var(--rim),
    inset 0 4px 0 rgba(0, 0, 0, 0.35),
    inset 0 -2px 0 color-mix(in srgb, var(--c) 30%, #000);
  transition: transform 0.07s;
}

.mark {
  width: 20px;
  height: 20px;
  fill: color-mix(in srgb, var(--struck-ink) 55%, var(--text));
  opacity: 0;
  transform: scale(0.5);
  transition:
    opacity 0.12s,
    transform 0.12s;
}

.strike:active .box {
  transform: translateY(1px);
}

/* A bad habit's box: rimmed red, and its cross stays red once given in. */
.strike.resist {
  --rim: color-mix(in srgb, var(--damage-color) 85%, #000);
  --well: color-mix(in srgb, var(--damage-color) 8%, var(--field, #141523));
  --flash: var(--damage-color);
}

.strike.resist .mark {
  fill: color-mix(in srgb, var(--damage-color) 80%, var(--tint-to));
}

/* Struck: every trace of colour goes, and the mark shows. */
.strike.struck .box {
  background: var(--struck-face);
  box-shadow: inset 0 0 0 2px var(--struck-lip);
}

.strike.struck .mark {
  opacity: 1;
  transform: none;
}

/* Resting: the same flat grey, empty. */
.strike.resting .box {
  background: var(--resting-face);
  box-shadow: inset 0 0 0 2px var(--struck-lip);
}

/* A spent or resting box lets the tap fall through to the card, which
   opens the skill's details. */
.strike:disabled {
  cursor: default;
  pointer-events: none;
}

/* Landing: the box flashes its type colour (red for a bad habit), then
   fades to grey. */
.strike.lit .box {
  animation: strike-land 0.6s ease-out;
}

@keyframes strike-land {
  from {
    background: var(--flash);
    box-shadow: none;
  }
}

/* A struck Overdrive skill with charges left: a slowly breathing ember ring
   round the box. Only its opacity animates. */
.strike.overdrive-ready::before {
  content: '';
  position: absolute;
  inset: 3px;
  clip-path: var(--px2);
  border: 1px solid var(--overdrive-color);
  box-shadow: inset 0 0 6px color-mix(in srgb, var(--overdrive-color) 35%, transparent);
  pointer-events: none;
  animation: overdrive-halo 5s ease-in-out infinite;
}

@keyframes overdrive-halo {
  50% {
    opacity: 0.55;
  }
}

.strike:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -4px;
}

@media (prefers-reduced-motion: reduce) {
  .strike.lit .box,
  .strike.overdrive-ready::before {
    animation: none;
  }

  .box,
  .mark {
    transition: none;
  }
}
</style>
