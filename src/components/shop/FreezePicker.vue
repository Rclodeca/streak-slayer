<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Minus, Plus } from 'lucide-vue-next';
import { FREEZE, addDaysToDayKey, formatDayKey, freezeCost, weekStartOf } from '../../game-engine';
import type { Habit } from '../../game-engine';
import { useVault } from '../../composables/useVault';
import { useAccountStore } from '../../store/accountStore';
import { useHabitStore } from '../../store/habitStore';
import RerollSkillRow from '../habits/RerollSkillRow.vue';
import { sortByDamageType } from '../habits/habitDisplay';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';

// Where a streak freeze is set up, for one skill: tap the skill, then when it
// starts and how long it lasts. It's bought ahead, never for a period under
// way: a daily from tomorrow, by the day (1 to FREEZE.maxDays); a weekly from
// next week, by the week (1 to FREEZE.maxWeeks). Periods that skill already
// has frozen aren't charged again. Nothing is paid until the confirm.
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const accountStore = useAccountStore();
const habitStore = useHabitStore();
const vault = useVault();

// Bad habits never miss on their own, so only skills can be frozen.
const skills = computed(() => habitStore.habits.filter((habit) => !habit.isBad));
const groups = computed(() => [
  { label: 'Daily', habits: sortByDamageType(skills.value.filter((habit) => habit.period === 'daily')) },
  { label: 'Weekly', habits: sortByDamageType(skills.value.filter((habit) => habit.period === 'weekly')) },
]);

const pickedId = ref<string | null>(null);
const picked = computed<Habit | undefined>(() => skills.value.find((habit) => habit.id === pickedId.value));
const weekly = computed(() => picked.value?.period === 'weekly');

// `lead` counts days ahead for a daily, weeks ahead for a weekly; `count` days or weeks.
const lead = ref(1);
const count = ref(1);
watch(pickedId, () => {
  lead.value = 1;
  count.value = 1;
});
const maxLead = computed(() => (weekly.value ? FREEZE.maxLeadWeeks : FREEZE.maxLeadDays));
const maxCount = computed(() => (weekly.value ? FREEZE.maxWeeks : FREEZE.maxDays));

const fromDayKey = computed(() =>
  weekly.value ? addDaysToDayKey(weekStartOf(vault.todayKey.value), 7 * lead.value) : addDaysToDayKey(vault.todayKey.value, lead.value),
);
const cost = computed(() => (picked.value ? freezeCost(picked.value, fromDayKey.value, count.value) : 0));
const short = computed(() => accountStore.account.gems < cost.value);

const startLabel = computed(() => {
  const date = formatDayKey(fromDayKey.value, true);
  if (weekly.value) return lead.value === 1 ? `Next week · ${date}` : `Week of ${formatDayKey(fromDayKey.value)}`;
  return lead.value === 1 ? `Tomorrow · ${date}` : date;
});
const countLabel = computed(() => {
  const unit = weekly.value ? 'week' : 'day';
  return count.value === 1 ? `1 ${unit}` : `${count.value} ${unit}s`;
});

function toggle(id: string) {
  pickedId.value = pickedId.value === id ? null : id;
}

function confirm() {
  if (!picked.value) return;
  if (vault.buyFreeze(picked.value.id, fromDayKey.value, count.value)) emit('update:modelValue', false);
}
</script>

<template>
  <Modal :model-value="modelValue" title="Streak Freeze" max-width="520px" @update:model-value="emit('update:modelValue', $event)">
    <p class="picker-hint">Pick a skill to freeze. It rests on the days you set: no misses, no streak gained.</p>

    <div v-for="group in groups" :key="group.label" class="habit-group">
      <template v-if="group.habits.length">
        <h3 class="habit-group-title">{{ group.label }}</h3>
        <ul class="reroll-list">
          <RerollSkillRow v-for="habit in group.habits" :key="habit.id" :habit="habit" :selected="habit.id === pickedId" @pick="toggle(habit.id)" />
        </ul>
      </template>
    </div>

    <template v-if="picked">
      <div class="freeze-step freeze-start">
        <span class="freeze-label">Starts</span>
        <button type="button" class="less" :disabled="lead <= 1" aria-label="Sooner" @click="lead--"><Minus :size="18" /></button>
        <span class="freeze-value">{{ startLabel }}</span>
        <button type="button" class="more" :disabled="lead >= maxLead" aria-label="Later" @click="lead++"><Plus :size="18" /></button>
      </div>

      <div class="freeze-step freeze-days">
        <span class="freeze-label">For</span>
        <button type="button" class="less" :disabled="count <= 1" aria-label="Shorter" @click="count--"><Minus :size="18" /></button>
        <span class="freeze-value">{{ countLabel }}</span>
        <button type="button" class="more" :disabled="count >= maxCount" aria-label="Longer" @click="count++"><Plus :size="18" /></button>
      </div>
    </template>

    <button type="button" class="ok primary-button" :disabled="!picked || cost === 0 || short" @click="confirm">
      <template v-if="!picked">Pick a skill</template>
      <template v-else-if="cost === 0">Already frozen</template>
      <template v-else-if="short">Not enough gems</template>
      <template v-else>
        Freeze {{ picked.name }} <span class="picker-price" :aria-label="`${cost} gems`"><StatIcon name="gems" :size="14" />{{ cost }}</span>
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

.freeze-step {
  display: grid;
  grid-template-columns: 3.5rem 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.freeze-start {
  margin-top: 1rem;
}

.freeze-step button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
}

.freeze-value {
  text-align: center;
  font-weight: 700;
}

.ok {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 1rem;
}

.picker-price {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}
</style>
