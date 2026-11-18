<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { goldPrice, trialCards } from '../../game-engine';
import type { TrialRung, TrialSetId } from '../../game-engine';
import { useCombatActions } from '../../composables/useCombatActions';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import StatIcon from '../ui/StatIcon.vue';
import { trialIcon } from './trialIcons';

// The trial sets as ledger cards (docs/mockups/trial-sets-2.html, A1): the
// name with the leading rung's prize, its deed, its bar or Claim, and pips for
// the whole ladder under it. Tapping a card folds its ladder out. Sets with a
// rung waiting come first, finished ones sink to the bottom (trialCards).

const characterStore = useCharacterStore();
const bossStore = useBossStore();
const { claimTrial } = useCombatActions();

const cards = computed(() => trialCards(characterStore.character));
const open = ref(new Set<TrialSetId>());

function toggle(id: TrialSetId) {
  const next = new Set(open.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  open.value = next;
}

/** A rung's gold, at the current boss and prestige (what a claim now would pay). */
const goldOf = (rung: TrialRung) => (rung.goldKills ? goldPrice(rung.goldKills, bossStore.boss.index, characterStore.character.prestige ?? 0) : 0);
</script>

<template>
  <ul v-if="cards.length" class="trial-list">
    <li
      v-for="card in cards"
      :key="card.def.id"
      class="trial"
      :class="{ ready: card.waiting, done: card.done, open: open.has(card.def.id) }"
      @click="toggle(card.def.id)"
    >
      <span class="trial-socket"><component :is="trialIcon(card.def.icon)" :size="22" /></span>
      <div class="trial-body">
        <div class="trial-head">
          <span class="trial-name">{{ card.def.name }}</span>
          <span v-if="card.rung" class="trial-pay">
            <span class="trial-gems" :aria-label="`${card.rung.gems} gems`"><StatIcon name="gems" :size="16" />{{ card.rung.gems }}</span>
            <span v-if="goldOf(card.rung)" class="trial-gold" :aria-label="`${goldOf(card.rung)} gold`"><StatIcon name="gold" :size="16" />{{ goldOf(card.rung) }}</span>
          </span>
        </div>
        <span v-if="card.done" class="trial-status">All {{ card.rungs.length }} done</span>
        <div v-else-if="card.waiting" class="trial-claim-row">
          <span class="trial-deed">{{ card.rung?.deed }}</span>
          <button type="button" class="trial-claim" @click.stop="claimTrial(card.def.id)"><StatIcon name="gift" :size="18" />Claim</button>
        </div>
        <template v-else>
          <span class="trial-deed">{{ card.rung?.deed }}</span>
          <span v-if="card.progress?.kind === 'bar'" class="trial-progress">
            <span class="trial-bar"><i :style="{ width: `${(card.progress.cur / card.progress.max) * 100}%` }" /></span>
            <span class="trial-count">{{ card.progress.cur }} / {{ card.progress.max }}</span>
          </span>
          <span v-else-if="card.progress?.kind === 'text'" class="trial-status">{{ card.progress.text }}</span>
        </template>
        <div class="trial-foot">
          <span class="trial-pips" aria-hidden="true"><i v-for="(r, i) in card.rungs" :key="i" :class="r.state" /></span>
          <span class="trial-rung">Rung {{ card.rungNumber }} of {{ card.rungs.length }}</span>
          <button
            type="button"
            class="trial-fold"
            :aria-expanded="open.has(card.def.id)"
            :aria-label="open.has(card.def.id) ? 'Hide rungs' : 'Show rungs'"
            @click.stop="toggle(card.def.id)"
          >
            <ChevronDown :size="18" />
          </button>
        </div>
        <!-- One Claim per card: the ladder shows a waiting rung's prize, the card's Claim pays it. -->
        <ul v-if="open.has(card.def.id)" class="trial-ladder">
          <li v-for="(r, i) in card.rungs" :key="i" :class="r.state">
            <span class="trial-mark"><Check v-if="r.state === 'paid'" :size="13" :stroke-width="3" /></span>
            <span class="trial-ladder-deed">{{ r.rung.deed }}</span>
            <span class="trial-pay">
              <span class="trial-gems"><StatIcon name="gems" :size="14" />{{ r.rung.gems }}</span>
              <span v-if="goldOf(r.rung)" class="trial-gold"><StatIcon name="gold" :size="14" />{{ goldOf(r.rung) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </li>
  </ul>
  <p v-else class="section-empty">Nothing sworn.</p>
</template>

<style scoped>
.trial-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.trial {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}

.trial-socket {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
}

.trial-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.trial-head,
.trial-claim-row,
.trial-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.trial-name {
  color: var(--text-h);
}

.trial-deed,
.trial-status,
.trial-count,
.trial-rung {
  color: var(--text);
  font-size: 0.8rem;
}

.trial-pay,
.trial-gems,
.trial-gold {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 0.2rem;
  white-space: nowrap;
}

.trial-pay {
  gap: 0.5rem;
}

.trial-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trial-bar {
  flex: 1;
  height: 6px;
  background: var(--border);
}

.trial-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
}

.trial-claim {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 0.35rem;
  min-height: 44px;
  padding: 0 0.9rem;
}

.trial-pips {
  display: flex;
  gap: 3px;
}

.trial-pips i {
  width: 9px;
  height: 9px;
  background: var(--border);
}

.trial-pips i.paid {
  background: var(--accent);
}

.trial-rung {
  flex: 1;
}

.trial-fold {
  display: grid;
  place-items: center;
  width: 44px;
  height: 36px;
  margin: -6px -10px -6px 0;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.trial-fold svg {
  transition: transform 0.15s;
}

.trial.open .trial-fold svg {
  transform: rotate(180deg);
}

.trial-ladder {
  list-style: none;
  margin: 0.4rem 0 0;
  padding: 0.5rem 0 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.trial-ladder li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 36px;
}

.trial-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
}

.trial-ladder-deed {
  flex: 1;
  font-size: 0.85rem;
}

.trial-ladder li.paid .trial-ladder-deed {
  text-decoration: line-through;
}

.trial.done .trial-name {
  text-decoration: line-through;
}
</style>
