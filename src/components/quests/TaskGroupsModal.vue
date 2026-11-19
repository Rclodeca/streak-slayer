<script setup lang="ts">
import { reactive, watch } from 'vue';
import { TASK_GROUP_DEFAULT_NAMES, TASK_GROUP_NAME_MAX, TASK_GROUPS, taskGroupName } from '../../game-engine';
import type { TaskGroup } from '../../game-engine';
import { useAccountStore } from '../../store/accountStore';
import { useQuestStore } from '../../store/questStore';
import Modal from '../ui/Modal.vue';
import { TASK_GROUP_ICONS, taskGroupColor } from './taskGroupStyle';

// Renaming the six task group slots (docs/mockups/tasks-b-p2.html, 3). Each
// slot keeps its icon and colour; only the name changes, saved as it's typed.
// A cleared name goes back to the default.
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const accountStore = useAccountStore();
const questStore = useQuestStore();

// What's in each box while it's open, so clearing one doesn't refill it with
// the default mid-typing.
const drafts = reactive({} as Record<TaskGroup, string>);
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    for (const g of TASK_GROUPS) drafts[g] = taskGroupName(accountStore.account, g);
  },
  { immediate: true },
);

function onInput(group: TaskGroup, value: string) {
  drafts[group] = value;
  accountStore.renameTaskGroup(group, value);
}

function openCount(group: TaskGroup): number {
  return questStore.quests.filter((q) => q.group === group && !q.doneDayKey).length;
}
</script>

<template>
  <Modal :model-value="modelValue" title="Groups" max-width="420px" @update:model-value="emit('update:modelValue', $event)">
    <div class="task-groups">
      <p class="intro">Name them for your life.</p>
      <div v-for="g in TASK_GROUPS" :key="g" class="group-row" :style="{ '--g': taskGroupColor(g) }">
        <span class="well" aria-hidden="true"><component :is="TASK_GROUP_ICONS[g]" :size="18" /></span>
        <input
          class="group-input"
          type="text"
          :value="drafts[g]"
          :maxlength="TASK_GROUP_NAME_MAX"
          :placeholder="TASK_GROUP_DEFAULT_NAMES[g]"
          :aria-label="`Name for the ${TASK_GROUP_DEFAULT_NAMES[g]} group`"
          @input="onInput(g, ($event.target as HTMLInputElement).value)"
        />
        <span class="count">{{ openCount(g) ? `${openCount(g)} left` : '' }}</span>
      </div>
      <button type="button" class="primary-button done" @click="emit('update:modelValue', false)">Done</button>
    </div>
  </Modal>
</template>

<style scoped>
.task-groups {
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
}

.intro {
  margin: 0 0 6px;
  text-align: center;
  color: var(--text);
  font-size: 0.9rem;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.well {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  clip-path: var(--px2);
  background: color-mix(in srgb, var(--g) 16%, var(--field));
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--g) 70%, #000);
  color: var(--g);
}

.group-input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  background: var(--input-fill);
  border: 0;
  clip-path: var(--px2);
  box-shadow:
    inset 2px 2px 0 var(--sunk-hi),
    inset -2px -2px 0 var(--sunk-lo);
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 1rem;
  font-weight: 600;
}

.group-input:focus {
  outline: none;
  box-shadow:
    inset 2px 2px 0 var(--sunk-hi),
    inset -2px -2px 0 var(--sunk-lo),
    inset 0 0 0 2px var(--accent);
}

.count {
  flex: none;
  width: 48px;
  text-align: right;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 700;
}

.done {
  margin-top: 10px;
}
</style>
