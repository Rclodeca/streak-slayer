<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { characterGold, expToNextLevel } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StatIcon from './StatIcon.vue';

// One plate above the tab bar for what a check, a kill or a claim just paid out
// (app-ui-pass.html, gainPopup): EXP, then gold, then gems. Gains that land close
// together (a kill pays EXP and gold at once) wait 400ms and show as one. A loss
// (spending, a death's toll, a prestige reset) adds nothing.
const FLUSH_MS = 400;
const SHOW_MS = 1900;

const characterStore = useCharacterStore();
const accountStore = useAccountStore();

const snapshot = computed(() => ({
  gold: characterGold(characterStore.character),
  gems: accountStore.account.gems,
  level: characterStore.character.level,
  exp: characterStore.character.exp,
}));

let last = { ...snapshot.value };
const pending = { gold: 0, gems: 0, exp: 0 };
const parts = ref<{ kind: 'exp' | 'gold' | 'gems'; amount: number }[]>([]);
const shown = ref(false);
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** EXP earned going from one level/exp to the next: the rest of each level passed, then what's in the new one. */
function expGained(from: { level: number; exp: number }, to: { level: number; exp: number }): number {
  if (to.level < from.level) return 0;
  if (to.level === from.level) return Math.max(0, to.exp - from.exp);
  let total = expToNextLevel(from.level) - from.exp;
  for (let level = from.level + 1; level < to.level; level++) total += expToNextLevel(level);
  return total + to.exp;
}

function flush() {
  const next: typeof parts.value = [];
  if (pending.exp > 0.5) next.push({ kind: 'exp', amount: pending.exp });
  if (pending.gold > 0) next.push({ kind: 'gold', amount: pending.gold });
  if (pending.gems > 0) next.push({ kind: 'gems', amount: pending.gems });
  pending.gold = pending.gems = pending.exp = 0;
  if (!next.length) return;
  parts.value = next;
  shown.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (shown.value = false), SHOW_MS);
}

watch(snapshot, (now) => {
  if (now.gold > last.gold) pending.gold += now.gold - last.gold;
  if (now.gems > last.gems) pending.gems += now.gems - last.gems;
  pending.exp += expGained(last, now);
  last = { ...now };
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_MS);
});

onScopeDispose(() => {
  clearTimeout(flushTimer);
  clearTimeout(hideTimer);
});

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
</script>

<template>
  <div class="gain-popup" :class="{ show: shown }" role="status">
    <span v-for="part in parts" :key="part.kind" class="gain-part" :class="{ exp: part.kind === 'exp' }">
      <template v-if="part.kind === 'exp'">+{{ fmt(part.amount) }} <small>EXP</small></template>
      <template v-else><StatIcon :name="part.kind" :size="15" />+{{ fmt(part.amount) }}</template>
    </span>
  </div>
</template>

<style scoped>
/* Always night, like the stage's plates, so it keeps the bright coin and gem and its
   fixed colours in every theme. It floats just above the tab bar (the bar is its
   positioned parent) and never takes a tap. */
.gain-popup {
  --icon-coin: #f0c64e;
  --icon-gem: #6fd6ea;
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  white-space: nowrap;
  pointer-events: none;
  background: #07080c;
  clip-path: var(--px2, none);
  box-shadow:
    inset 2px 2px 0 #333c52,
    inset -2px -2px 0 #0c0f15;
  color: #f0f3f7;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  opacity: 0;
  transform: translate(-50%, 10px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.gain-popup.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

.gain-part {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.gain-part.exp {
  color: var(--exp-color, #e3c26a);
}

.gain-part small {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

@media (prefers-reduced-motion: reduce) {
  .gain-popup,
  .gain-popup.show {
    transform: translate(-50%, 0);
    transition: opacity 0.2s;
  }
}
</style>
