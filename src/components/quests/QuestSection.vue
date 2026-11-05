<script setup lang="ts">
import { computed, ref } from 'vue';
import { Lock, Plus, ScrollText } from 'lucide-vue-next';
import { dailyPeriodKey, questsOpen, QUESTS_UNLOCK_LEVEL } from '../../game-engine';
import type { Difficulty, Quest } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import { useQuestCompleteQueue } from '../../composables/useQuestCompleteQueue';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugClockStore } from '../../store/debugClockStore';
import { useQuestStore } from '../../store/questStore';
import Modal from '../ui/Modal.vue';
import QuestDetailModal from './QuestDetailModal.vue';
import QuestForm from './QuestForm.vue';
import SealedNotice from './SealedNotice.vue';

const questStore = useQuestStore();
const characterStore = useCharacterStore();
const debugClockStore = useDebugClockStore();

// Sealed until QUESTS_UNLOCK_LEVEL each run, unless quests carried over (see questsOpen).
const open = computed(() => questsOpen(characterStore.character));
const { completeQuest, addQuest } = useCombatActions();
const { enqueue: enqueueCompletion } = useQuestCompleteQueue();

const PIPS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const MS_PER_DAY = 86_400_000;

const todayKey = computed(() => dailyPeriodKey(debugClockStore.now()));
const showAdd = ref(false);
const detailId = ref<string | null>(null);
const detailQuest = computed(() => questStore.quests.find((q) => q.id === detailId.value) ?? null);

// Soonest due first, checked-off quests last; dueDateKey is YYYY-MM-DD so it sorts as text, and ties keep their added order.
const sortedQuests = computed(() =>
  [...questStore.quests].sort((a, b) => Number(!!a.doneDayKey) - Number(!!b.doneDayKey) || a.dueDateKey.localeCompare(b.dueDateKey)),
);

function daysLeft(quest: Quest): number {
  return Math.round((Date.parse(`${quest.dueDateKey}T00:00:00Z`) - Date.parse(`${todayKey.value}T00:00:00Z`)) / MS_PER_DAY);
}

function urgency(quest: Quest): 'urgent' | 'soon' | 'calm' {
  if (quest.doneDayKey) return 'calm';
  if (quest.overdue) return 'urgent';
  const days = daysLeft(quest);
  if (days <= 0) return 'urgent';
  return days <= 2 ? 'soon' : 'calm';
}

function dueText(quest: Quest): string {
  if (quest.doneDayKey) return 'Done';
  if (quest.overdue) return 'Overdue';
  const days = daysLeft(quest);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

function onAdd(description: string, difficulty: Difficulty, dueDateKey: string) {
  addQuest(description, difficulty, dueDateKey);
  showAdd.value = false;
}

function onCheckOff(quest: Quest) {
  const result = completeQuest(quest.id);
  if (result && result.amount > 0) {
    enqueueCompletion({ description: quest.description, difficulty: quest.difficulty, amount: result.amount });
  }
}
</script>

<template>
  <section class="quest-section" :class="{ locked: !open }">
    <div class="quest-header">
      <h2><Lock v-if="!open" :size="16" class="section-icon lock-icon" /><ScrollText v-else :size="16" class="section-icon" />Quests</h2>
      <button v-if="open" type="button" class="add-button" aria-label="Add quest" @click="showAdd = true"><Plus :size="16" /></button>
    </div>
    <p class="section-caption">One-off tasks</p>
    <SealedNotice v-if="!open" :level="QUESTS_UNLOCK_LEVEL" />
    <ul v-else-if="questStore.quests.length">
      <li
        v-for="quest in sortedQuests"
        :key="quest.id"
        class="quest-item"
        :class="[urgency(quest), { done: !!quest.doneDayKey }]"
      >
        <label class="check-zone">
          <input
            type="checkbox"
            class="check"
            :checked="!!quest.doneDayKey"
            :disabled="!!quest.doneDayKey"
            :aria-label="`Complete ${quest.description}`"
            @change="onCheckOff(quest)"
          />
        </label>
        <button type="button" class="body" @click="detailId = quest.id">
          <span class="description">{{ quest.description }}</span>
          <span class="meta">
            <span class="pips" :title="quest.difficulty">
              <span v-for="n in 3" :key="n" class="pip" :class="{ lit: n <= PIPS[quest.difficulty] }" />
            </span>
            <span class="due">{{ dueText(quest) }}</span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else class="section-empty">No quests yet. Tap +.</p>
  </section>

  <Modal v-model="showAdd" title="New quest" max-width="480px">
    <QuestForm @submit="onAdd" />
  </Modal>

  <QuestDetailModal :quest="detailQuest" @close="detailId = null" />
</template>

<style scoped>
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

.check {
  appearance: none;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: 0;
  background: transparent;
  border: 2px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.check:hover {
  border-color: var(--accent-border);
}

.check:checked {
  background: var(--accent-solid);
  border-color: var(--accent-solid);
}

.check:checked::after {
  content: '✓';
  color: var(--bg);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.check:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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

.pips {
  display: flex;
  gap: 0.25rem;
}

.pip {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--border);
  border-radius: 50%;
}

.pip.lit {
  background: var(--accent);
}

.due {
  color: var(--text);
}

.soon .due {
  color: var(--soon-color);
}

.urgent .due {
  color: var(--damage-color);
}
</style>
