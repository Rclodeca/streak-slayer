<script setup lang="ts">
import { computed, ref } from 'vue';
import { Lock, Pencil, Plus, ScrollText } from 'lucide-vue-next';
import { dailyPeriodKey, questsOpen, QUESTS_UNLOCK_LEVEL, TASK_GROUPS, taskGroupName } from '../../game-engine';
import type { Difficulty, Quest, TaskGroup } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import { useQuestDone } from '../../composables/useQuestDone';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import StrikeButton from '../habits/StrikeButton.vue';
import Modal from '../ui/Modal.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import QuestDetailModal from './QuestDetailModal.vue';
import QuestForm from './QuestForm.vue';
import SealedNotice from './SealedNotice.vue';
import TaskGroupsModal from './TaskGroupsModal.vue';
import { TASK_GROUP_ICONS, taskGroupColor } from './taskGroupStyle';

const questStore = useQuestStore();
const accountStore = useAccountStore();
const characterStore = useCharacterStore();
const debugClockStore = useDebugClockStore();

// Sealed until QUESTS_UNLOCK_LEVEL each run, unless quests carried over (see questsOpen).
const open = computed(() => questsOpen(characterStore.character));
const { completeQuest, addQuest } = useCombatActions();
const { showQuestDone } = useQuestDone();

const MS_PER_DAY = 86_400_000;
const LAND_MS = 650;

const todayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
const showAdd = ref(false);
const showGroups = ref(false);
const detailId = ref<string | null>(null);
const detailQuest = computed(() => questStore.quests.find((q) => q.id === detailId.value) ?? null);
const landingId = ref<string | null>(null);

// The group chips (docs/mockups/tasks-b-p2.html): All, then only the groups
// that hold a task, so the row stays short. A filter whose last task is gone
// falls back to All.
const filter = ref<TaskGroup | 'all'>('all');
const groupsInUse = computed(() => TASK_GROUPS.filter((g) => questStore.quests.some((q) => q.group === g)));
const activeFilter = computed(() => (filter.value !== 'all' && groupsInUse.value.includes(filter.value) ? filter.value : 'all'));

function openCount(group: TaskGroup | 'all'): number {
  return questStore.quests.filter((q) => !q.doneDayKey && (group === 'all' || q.group === group)).length;
}

// Soonest due first, no deadline last, checked-off quests stay in place; dueDateKey is YYYY-MM-DD so it sorts as text, and ties keep their added order.
const NO_DEADLINE_SORT = '9999-12-31';
const sortedQuests = computed(() =>
  [...questStore.quests]
    .filter((q) => activeFilter.value === 'all' || q.group === activeFilter.value)
    .sort((a, b) => (a.dueDateKey ?? NO_DEADLINE_SORT).localeCompare(b.dueDateKey ?? NO_DEADLINE_SORT)),
);

const groupName = (group: TaskGroup) => taskGroupName(accountStore.account, group);

function daysLeft(dueDateKey: string): number {
  return Math.round((Date.parse(`${dueDateKey}T00:00:00Z`) - Date.parse(`${todayKey.value}T00:00:00Z`)) / MS_PER_DAY);
}

function urgency(quest: Quest): 'urgent' | 'soon' | 'calm' {
  if (quest.doneDayKey) return 'calm';
  if (quest.overdue) return 'urgent';
  if (!quest.dueDateKey) return 'calm';
  const days = daysLeft(quest.dueDateKey);
  if (days <= 0) return 'urgent';
  return days <= 2 ? 'soon' : 'calm';
}

// Empty for a quest with no deadline: its card shows no date.
function dueText(quest: Quest): string {
  if (quest.doneDayKey) return 'Done';
  if (quest.overdue) return 'Overdue';
  if (!quest.dueDateKey) return '';
  const days = daysLeft(quest.dueDateKey);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

function onAdd(description: string, difficulty: Difficulty, dueDateKey: string | undefined, group?: TaskGroup) {
  addQuest(description, difficulty, dueDateKey, group);
  showAdd.value = false;
}

function onCheckOff(quest: Quest) {
  if (quest.doneDayKey) return;
  landingId.value = quest.id;
  setTimeout(() => {
    if (landingId.value === quest.id) landingId.value = null;
  }, LAND_MS);
  const result = completeQuest(quest.id);
  if (result && result.amount > 0) {
    showQuestDone({ description: quest.description, amount: result.amount });
  }
}
</script>

<template>
  <section class="quest-section" :class="{ locked: !open }">
    <div class="quest-header">
      <SectionTitle title="Tasks"><Lock v-if="!open" :size="18" class="section-icon lock-icon" /><ScrollText v-else :size="18" class="section-icon" /></SectionTitle>
      <button v-if="open" type="button" class="add-button" aria-label="Add task" @click="showAdd = true"><Plus :size="16" /></button>
    </div>
    <p class="section-caption">Todos</p>
    <SealedNotice v-if="!open" :level="QUESTS_UNLOCK_LEVEL" />
    <template v-else-if="questStore.quests.length">
      <div v-if="groupsInUse.length" class="group-chips" role="toolbar" aria-label="Filter by group">
        <button type="button" class="group-chip" :class="{ on: activeFilter === 'all' }" :aria-pressed="activeFilter === 'all'" @click="filter = 'all'">
          All <b>{{ openCount('all') }}</b>
        </button>
        <button
          v-for="group in groupsInUse"
          :key="group"
          type="button"
          class="group-chip"
          :class="{ on: activeFilter === group }"
          :style="{ '--g': taskGroupColor(group) }"
          :aria-pressed="activeFilter === group"
          @click="filter = group"
        >
          <component :is="TASK_GROUP_ICONS[group]" :size="14" class="group-icon" />{{ groupName(group) }} <b>{{ openCount(group) }}</b>
        </button>
        <button type="button" class="group-chip edit" aria-label="Rename groups" @click="showGroups = true"><Pencil :size="14" /></button>
      </div>
      <ul>
        <li
          v-for="quest in sortedQuests"
          :key="quest.id"
          class="quest-item"
          :class="[urgency(quest), { done: !!quest.doneDayKey }]"
          :style="{ '--c': taskGroupColor(quest.group) }"
        >
          <!-- The habit's check box, rimmed in the group's colour (docs/mockups/tasks-b-p2.html). -->
          <StrikeButton
            :state="quest.doneDayKey ? 'struck' : 'open'"
            :lit="landingId === quest.id"
            :label="`Complete ${quest.description}`"
            @strike="onCheckOff(quest)"
          />
          <button type="button" class="body" @click="detailId = quest.id">
            <span class="description">{{ quest.description }}</span>
            <span class="meta">
              <span v-if="quest.group" class="group" :style="{ '--g': taskGroupColor(quest.group) }"
                ><component :is="TASK_GROUP_ICONS[quest.group]" :size="12" class="group-icon" />{{ groupName(quest.group)
                }}<span v-if="dueText(quest)" class="sep" aria-hidden="true">·</span></span
              >
              <span v-if="dueText(quest)" class="due">{{ dueText(quest) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </template>
    <p v-else class="section-empty">No tasks yet. Tap +.</p>
  </section>

  <Modal v-model="showAdd" title="New task" max-width="480px">
    <QuestForm @submit="onAdd" @rename="showGroups = true" />
  </Modal>

  <TaskGroupsModal v-model="showGroups" />

  <QuestDetailModal :quest="detailQuest" @close="detailId = null" />
</template>

<style scoped>
.quest-section {
  min-width: 0;
}

.quest-section ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quest-item {
  --tone: var(--border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--tone);
  border-radius: 8px;
}

.quest-item.soon {
  --tone: var(--soon-color);
}

.quest-item.urgent {
  --tone: var(--damage-color);
  box-shadow: 0 0 14px -8px var(--damage-color);
}

.quest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quest-header h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

/* Sealed until QUESTS_UNLOCK_LEVEL (SealedNotice). */
.locked h2 {
  color: var(--text);
}

.quest-section ul {
  margin-top: 0.75rem;
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  text-align: left;
  cursor: pointer;
}

.description {
  color: var(--text-h);
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
}

.group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.group-icon {
  flex: none;
  color: var(--g);
}

.sep {
  margin-left: 2px;
}

.due {
  color: var(--text);
}

.group-chips {
  display: flex;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  margin-bottom: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.group-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 40px;
  padding: 0 11px;
}

.soon .due {
  color: var(--soon-color);
}

.urgent .due {
  color: var(--damage-color);
}
</style>
