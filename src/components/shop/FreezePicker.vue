<script setup lang="ts">
import { computed, ref } from 'vue';
import { Minus, Plus } from 'lucide-vue-next';
import { FREEZE, addDaysToDayKey, formatDayKey, freezeCost } from '../../game-engine';
import { useVault } from '../../composables/useVault';
import { useAccountStore } from '../../store/accountStore';
import { useActivityLogStore } from '../../store/activityLogStore';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';

// Where a streak freeze is set up: it starts tomorrow at the earliest (it's
// bought ahead, never for a day under way) and covers 1 to FREEZE.maxDays days.
// Days already frozen aren't charged again. Nothing is paid until the confirm.
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const accountStore = useAccountStore();
const activityLogStore = useActivityLogStore();
const { todayKey } = useVault();

const lead = ref(1);
const days = ref(1);
const fromDayKey = computed(() => addDaysToDayKey(todayKey.value, lead.value));
const cost = computed(() => freezeCost(accountStore.account, fromDayKey.value, days.value));
const short = computed(() => accountStore.account.gems < cost.value);

const startLabel = computed(() => {
  const date = formatDayKey(fromDayKey.value, true);
  return lead.value === 1 ? `Tomorrow · ${date}` : date;
});

function confirm() {
  const gems = accountStore.buyFreeze(todayKey.value, fromDayKey.value, days.value);
  if (gems === null) return;
  activityLogStore.addEntry({ kind: 'freeze-bought', fromDayKey: fromDayKey.value, days: days.value, gems });
  emit('update:modelValue', false);
}
</script>

<template>
  <Modal :model-value="modelValue" title="Streak Freeze" max-width="420px" @update:model-value="emit('update:modelValue', $event)">
    <p class="picker-hint">Set it up ahead. Frozen days rest every skill: no misses, no streak gained.</p>

    <div class="freeze-step freeze-start">
      <span class="freeze-label">Starts</span>
      <button type="button" class="less" :disabled="lead <= 1" aria-label="A day sooner" @click="lead--"><Minus :size="18" /></button>
      <span class="freeze-value">{{ startLabel }}</span>
      <button type="button" class="more" :disabled="lead >= FREEZE.maxLeadDays" aria-label="A day later" @click="lead++"><Plus :size="18" /></button>
    </div>

    <div class="freeze-step freeze-days">
      <span class="freeze-label">For</span>
      <button type="button" class="less" :disabled="days <= 1" aria-label="One day fewer" @click="days--"><Minus :size="18" /></button>
      <span class="freeze-value">{{ days === 1 ? '1 day' : `${days} days` }}</span>
      <button type="button" class="more" :disabled="days >= FREEZE.maxDays" aria-label="One day more" @click="days++"><Plus :size="18" /></button>
    </div>

    <button type="button" class="ok primary-button" :disabled="cost === 0 || short" @click="confirm">
      <template v-if="cost === 0">Already frozen</template>
      <template v-else-if="short">Not enough gems</template>
      <template v-else>
        Freeze <span class="picker-price" :aria-label="`${cost} gems`"><StatIcon name="gems" :size="14" />{{ cost }}</span>
      </template>
    </button>
  </Modal>
</template>

<style scoped>
.picker-hint {
  margin: 0 0 0.75rem;
}

.freeze-step {
  display: grid;
  grid-template-columns: 3.5rem 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
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
