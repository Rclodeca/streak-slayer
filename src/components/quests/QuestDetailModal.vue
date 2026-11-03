<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Calendar, Gift } from 'lucide-vue-next';
import { dailyPeriodKey, daysBetweenDayKeys } from '../../game-engine';
import type { Quest } from '../../game-engine';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';

const props = defineProps<{ quest: Quest | null }>();
const emit = defineEmits<{ close: [] }>();

const questStore = useQuestStore();
const debugClockStore = useDebugClockStore();

const PIPS = { easy: 1, medium: 2, hard: 3 };

const dueDate = computed(() =>
  props.quest
    ? new Date(`${props.quest.dueDateKey}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '',
);

const daysLeft = computed(() => (props.quest ? daysBetweenDayKeys(dailyPeriodKey(debugClockStore.now()), props.quest.dueDateKey) : 0));

const dueText = computed(() => {
  if (props.quest?.overdue || daysLeft.value < 0) return 'Overdue';
  if (daysLeft.value === 0) return 'Today';
  if (daysLeft.value === 1) return 'Tomorrow';
  return `${daysLeft.value} days left`;
});

const tone = computed(() => (props.quest?.overdue || daysLeft.value <= 0 ? 'urgent' : daysLeft.value <= 2 ? 'soon' : 'calm'));

// A side quest's item stays hidden until it's earned; once overdue its relic is forfeit and it pays half EXP like any other.
const mystery = computed(() => props.quest?.kind === 'side' && !props.quest.overdue);

// Two-tap confirm, as on a habit: the first tap only asks.
const confirmingRemove = ref(false);
watch(
  () => props.quest?.id,
  () => {
    confirmingRemove.value = false;
  },
);

function removeQuest() {
  if (!props.quest) return;
  questStore.removeQuest(props.quest.id);
  confirmingRemove.value = false;
  emit('close');
}
</script>

<template>
  <Modal :model-value="quest !== null" :title="quest?.kind === 'side' ? 'Side quest' : 'Quest'" max-width="420px" @update:model-value="emit('close')">
    <div v-if="quest" class="quest-detail" :class="{ side: quest.kind === 'side' }">
      <div class="deed-well">
        <p class="deed">{{ quest.description }}</p>
      </div>
      <div class="plates">
        <div class="plate">
          <span class="plate-label">Due</span>
          <span class="due-line" :class="tone">
            <span class="due-date"><Calendar :size="14" />{{ dueDate }}</span>
            <small>{{ dueText }}</small>
          </span>
        </div>
        <div class="plate">
          <span class="plate-label">Reward</span>
          <span v-if="mystery" class="reward gift" title="An unknown item"><Gift :size="20" /><span class="mark">?</span></span>
          <span v-else class="reward" :title="quest.overdue ? 'Half EXP' : 'EXP'">
            <StatIcon name="exp" :size="20" />
            <span class="pips">
              <span v-for="n in 3" :key="n" class="pip" :class="{ lit: n <= PIPS[quest.difficulty] }" />
            </span>
            <small v-if="quest.overdue">Half</small>
          </span>
        </div>
      </div>
      <div v-if="!quest.doneDayKey" class="remove-section">
        <button v-if="!confirmingRemove" type="button" class="remove-button" @click="confirmingRemove = true">Delete quest</button>
        <template v-else>
          <span class="confirm-text">Delete "{{ quest.description }}" for good?</span>
          <div class="confirm-actions">
            <button type="button" class="confirm-remove-button" @click="removeQuest">Yes, delete it</button>
            <button type="button" class="cancel-button" @click="confirmingRemove = false">Cancel</button>
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.quest-detail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.deed {
  margin: 0;
  color: var(--text-h);
  font-size: 1.1rem;
  overflow-wrap: anywhere;
}

.plates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.plate {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.plate-label {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.due-line {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: var(--text-h);
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.due-line.soon small {
  color: var(--soon-color);
}

.due-line.urgent small {
  color: var(--damage-color);
}

.reward {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--stat-color);
}

.pips {
  display: flex;
  gap: 0.3rem;
}

.pip {
  width: 0.55rem;
  height: 0.55rem;
  background: var(--border);
  border-radius: 50%;
}

.pip.lit {
  background: var(--accent);
}

.remove-section {
  text-align: center;
}

.remove-button {
  padding: 0.4rem 0.6rem;
  color: #dc2626;
  background: transparent;
  border: none;
  font-size: 0.8rem;
}

.confirm-text {
  display: block;
  margin-bottom: 0.5rem;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.confirm-remove-button {
  background: #dc2626;
  color: white;
  border: none;
}
</style>
