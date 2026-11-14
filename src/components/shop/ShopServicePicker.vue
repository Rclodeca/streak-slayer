<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enchantTargets, overdriveTargets, rerollTargets } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useServices } from '../../composables/useServices';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import RerollSkillRow from '../habits/RerollSkillRow.vue';
import { sortByDamageType } from '../habits/habitDisplay';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import ShopItemLines from './ShopItemLines.vue';

// Where a service that needs a target asks for it: tap a skill (reroll,
// Overdrive) or a worn item (enchant), then confirm. Nothing is paid until the
// confirm, and a target that has gone by then buys nothing (useServices).
const props = defineProps<{ modelValue: boolean; service: 'reroll' | 'overdrive' | 'enchant' }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const characterStore = useCharacterStore();
const habitStore = useHabitStore();
const services = useServices();
const baseUrl = import.meta.env.BASE_URL;

const NAMES = { reroll: 'Reroll', overdrive: 'Overdrive', enchant: 'Enchant' } as const;
const HINTS = {
  reroll: 'Pick a skill to re-roll. Its damage type changes; nothing else does.',
  overdrive: 'Pick a skill to Overdrive.',
  enchant: 'Pick a worn item to enchant.',
} as const;

const pickedId = ref<string | null>(null);
watch(
  () => [props.modelValue, props.service],
  () => {
    pickedId.value = null;
  },
);

const skills = computed<Habit[]>(() => {
  if (props.service === 'enchant') return [];
  return props.service === 'reroll' ? rerollTargets(habitStore.habits) : overdriveTargets(habitStore.habits);
});
const groups = computed(() => [
  { label: 'Daily', habits: sortByDamageType(skills.value.filter((habit) => habit.period === 'daily')) },
  { label: 'Weekly', habits: sortByDamageType(skills.value.filter((habit) => habit.period === 'weekly')) },
]);
const items = computed(() => (props.service === 'enchant' ? enchantTargets(characterStore.character) : []));

const state = computed(() => services.state(props.service));
const picked = computed(() => (props.service === 'enchant' ? items.value.find((item) => item.id === pickedId.value) : skills.value.find((habit) => habit.id === pickedId.value)));

function toggle(id: string) {
  pickedId.value = pickedId.value === id ? null : id;
}

function confirm() {
  const target = picked.value;
  if (!target) return;
  const bought =
    props.service === 'reroll' ? services.buyReroll(target.id) : props.service === 'overdrive' ? services.buyOverdrive(target.id) : services.buyEnchant(target.id);
  if (bought) emit('update:modelValue', false);
}
</script>

<template>
  <Modal :model-value="modelValue" :title="NAMES[service]" max-width="520px" @update:model-value="emit('update:modelValue', $event)">
    <p class="picker-hint">{{ HINTS[service] }}</p>

    <template v-if="service !== 'enchant'">
      <div v-for="group in groups" :key="group.label" class="habit-group">
        <template v-if="group.habits.length">
          <h3 class="habit-group-title">{{ group.label }}</h3>
          <ul class="reroll-list">
            <RerollSkillRow v-for="habit in group.habits" :key="habit.id" :habit="habit" :selected="habit.id === pickedId" @pick="toggle(habit.id)" />
          </ul>
        </template>
      </div>
    </template>

    <ul v-else class="reroll-list pick-items">
      <li v-for="item in items" :key="item.id">
        <button type="button" class="shop-ware-row item pick-row" :class="[`rarity-${item.rarity}`, { selected: item.id === pickedId }]" :aria-pressed="item.id === pickedId" @click="toggle(item.id)">
          <span class="shop-socket"><img class="shop-art" :src="`${baseUrl}sprites/${item.icon}.png`" alt="" /></span>
          <span class="shop-mid">
            <strong class="shop-name">{{ item.name }}</strong>
            <ShopItemLines :item="item" />
          </span>
        </button>
      </li>
    </ul>

    <button type="button" class="ok primary-button" :disabled="!picked || state.status === 'short'" @click="confirm">
      <template v-if="!picked">{{ service === 'enchant' ? 'Pick an item' : 'Pick a skill' }}</template>
      <template v-else-if="state.status === 'short'">Not enough gold</template>
      <template v-else>
        {{ NAMES[service] }} {{ picked.name }} <span class="picker-price"><StatIcon name="gold" :size="14" />{{ state.price.toLocaleString('en-US') }}</span>
      </template>
    </button>
  </Modal>
</template>

<style scoped>
.picker-hint {
  margin: 0 0 0.75rem;
}

.habit-group {
  margin-top: 0.75rem;
}

.reroll-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pick-row {
  width: 100%;
  min-height: 44px;
  text-align: left;
  cursor: pointer;
}

.pick-row.selected {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

.ok {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 0.75rem;
}

.picker-price {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}
</style>
