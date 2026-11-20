<script setup lang="ts">
import { computed } from 'vue';
import { characterGold } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import StatIcon from '../ui/StatIcon.vue';

// The phone's purse (docs/superpowers/specs/2026-11-16-stage-purse-design.md): gold
// and gems on one small plate just left of the menu, its top level with the side
// rail's, on every tab's top bar (it rides in their corner slot, AppShell). A gain
// shows in the gain popup over the tab bar, not here.
withDefaults(defineProps<{ plate?: boolean }>(), { plate: true });

const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const gold = computed(() => characterGold(characterStore.character));
const gems = computed(() => accountStore.account.gems);
</script>

<template>
  <div class="stage-purse" :class="{ bare: !plate }">
    <span v-if="plate" class="purse-plate" :aria-label="`${gold.toLocaleString('en-US')} gold, ${gems.toLocaleString('en-US')} gems`">
      <span class="purse-count"><StatIcon name="gold" :size="13" />{{ gold.toLocaleString('en-US') }}</span>
      <span class="purse-count"><StatIcon name="gems" :size="13" />{{ gems.toLocaleString('en-US') }}</span>
    </span>
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
</style>
