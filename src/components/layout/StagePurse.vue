<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { characterGold } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StatIcon from '../ui/StatIcon.vue';

// The phone's purse (docs/superpowers/specs/2026-11-16-stage-purse-design.md): gold
// and gems on one small plate just left of the menu, its top level with the side
// rail's, on every tab's top bar (it rides in their corner slot, AppShell). The Focus
// strip has no room for the plate (`plate` off), but a gain still shows there: a
// small green +N with the currency's icon that rises and fades. Spending only
// changes the number.
withDefaults(defineProps<{ plate?: boolean }>(), { plate: true });

const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const gold = computed(() => characterGold(characterStore.character));
const gems = computed(() => accountStore.account.gems);

type Gain = { id: number; kind: 'gold' | 'gems'; amount: number };
const gains = ref<Gain[]>([]);
const GAIN_MS = 1600;
let nextId = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();

function gain(kind: Gain['kind'], now: number, before: number) {
  if (now <= before) return;
  const id = nextId++;
  gains.value.push({ id, kind, amount: now - before });
  const timer = setTimeout(() => {
    timers.delete(timer);
    gains.value = gains.value.filter((g) => g.id !== id);
  }, GAIN_MS);
  timers.add(timer);
}

watch(gold, (now, before) => gain('gold', now, before));
watch(gems, (now, before) => gain('gems', now, before));
onScopeDispose(() => timers.forEach(clearTimeout));
</script>

<template>
  <div class="stage-purse" :class="{ bare: !plate }">
    <span v-if="plate" class="purse-plate" :aria-label="`${gold.toLocaleString('en-US')} gold, ${gems.toLocaleString('en-US')} gems`">
      <span class="purse-count"><StatIcon name="gold" :size="13" />{{ gold.toLocaleString('en-US') }}</span>
      <span class="purse-count"><StatIcon name="gems" :size="13" />{{ gems.toLocaleString('en-US') }}</span>
    </span>
    <span v-for="g in gains" :key="g.id" class="purse-gain" aria-hidden="true">+{{ g.amount.toLocaleString('en-US') }}<StatIcon :name="g.kind" :size="11" /></span>
  </div>
</template>

<style scoped>
/* Hangs off the side rail's left edge (the slot's .stage-menu), its top level with the
   rail's. Absolute, so the rail keeps its size. */
.stage-purse {
  position: absolute;
  top: 0;
  right: calc(100% + 4px);
  pointer-events: none;
}

/* The plate is dark in every theme (the stage is always night), so it keeps the bright
   gold and gem whatever the theme's own are. */
.purse-plate {
  --icon-coin: #f0c64e;
  --icon-gem: #6fd6ea;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 26px;
  padding: 5px 9px;
  box-sizing: border-box;
  white-space: nowrap;
  background: rgba(7, 8, 12, 0.88);
  box-shadow:
    inset 2px 2px 0 #333c52,
    inset -2px -2px 0 #0c0f15;
  clip-path: var(--px2, none);
  color: #f0f3f7;
  font-family: var(--serif);
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1;
}

.purse-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* A gain: under the plate, or beside the menu when there's no plate (the Focus strip). */
.purse-gain {
  --icon-coin: #f0c64e;
  --icon-gem: #6fd6ea;
  position: absolute;
  top: 29px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #4ac777;
  text-shadow:
    1px 0 0 #000,
    -1px 0 0 #000,
    0 1px 0 #000,
    0 -1px 0 #000,
    1px 1px 0 #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000;
  animation: purse-gain 1.6s ease-out forwards;
}

.bare .purse-gain {
  top: 14px;
  right: 0;
}

@keyframes purse-gain {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }

  15%,
  70% {
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .purse-gain {
    animation: none;
  }
}
</style>
