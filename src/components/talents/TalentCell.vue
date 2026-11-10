<script setup lang="ts">
import { Lock } from 'lucide-vue-next';
import type { TalentDef } from '../../game-engine';
import { TALENT_LOOK } from './talentDisplay';
import type { TalentState } from './talentDisplay';

// One node on the tree: its socket, name and a pip a rank. The whole cell is the
// tap target (TalentSection opens the node's popup).
defineProps<{ def: TalentDef; state: TalentState; rank: number; place: 'lft' | 'mid' | 'rgt' }>();
defineEmits<{ pick: [] }>();
</script>

<template>
  <div class="cell n" :class="[state, place, { main: place === 'mid', top: def.kind === 'top' }]">
    <button type="button" class="node" :aria-label="`${def.name}, ${rank} of ${def.maxRank}`" @click="$emit('pick')">
      <span class="sock" :style="{ '--c': TALENT_LOOK[def.id].color }">
        <component :is="TALENT_LOOK[def.id].icon" aria-hidden="true" />
        <Lock v-if="state === 'locked'" :size="11" class="lk" aria-hidden="true" />
      </span>
      <span class="nm">{{ def.name }}</span>
      <span class="pips" aria-hidden="true"><i v-for="n in def.maxRank" :key="n" class="pip" :class="{ lit: n <= rank }" /></span>
    </button>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.cell {
  position: relative;
  z-index: 1;
  grid-row: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.cell.lft {
  grid-column: 1;
}

.cell.mid {
  grid-column: 2;
}

.cell.rgt {
  grid-column: 3;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 44px;
  min-height: 44px;
  padding: 6px 2px;
  text-align: center;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.sock {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  color: var(--c);
}

.cell.main .sock {
  width: 52px;
  height: 52px;
}

.cell.top .sock {
  width: 52px;
  height: 52px;
}

.lk {
  position: absolute;
  right: 2px;
  bottom: 2px;
}

/* The names and pips sit on the page colour, so the trunk passes behind them. */
.nm,
.pips {
  position: relative;
}

.pips {
  display: inline-flex;
  gap: 3px;
}

.pip {
  width: 6px;
  height: 6px;
}
</style>
