<script setup lang="ts">
import { computed } from 'vue';
import { describeItemBonusParts } from '../../game-engine';
import type { ItemDef } from '../../game-engine';
import StatIcon from '../ui/StatIcon.vue';
import { BOOST_STAT_ICON } from '../ui/statIcons';

// What a stocked item does: its bonus chips (as on the item card) and its effect line.
const props = defineProps<{ item: ItemDef }>();
const chips = computed(() => describeItemBonusParts(props.item));
</script>

<template>
  <div v-if="chips.length" class="shop-bonuses">
    <span v-for="chip in chips" :key="`${chip.stat}${chip.text}`" class="shop-bonus" :class="{ drawback: chip.text.startsWith('−') }">
      <StatIcon :name="BOOST_STAT_ICON[chip.stat]" /><b>{{ chip.text }}</b> {{ chip.label }}
    </span>
  </div>
  <p v-if="item.effectText" class="shop-effect">{{ item.effectText }}</p>
</template>

<style scoped>
.shop-bonuses {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
}

.shop-bonus {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.shop-effect {
  margin: 0;
}
</style>
