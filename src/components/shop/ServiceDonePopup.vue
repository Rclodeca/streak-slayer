<script setup lang="ts">
import type { DamageType } from '../../game-engine';
import { useModalPriority } from '../../composables/useModalPriority';
import { useServices } from '../../composables/useServices';
import Modal from '../ui/Modal.vue';
import StatIcon from '../ui/StatIcon.vue';
import type { StatIconName } from '../ui/statIcons';

// What a reroll just did, once the picker has closed: the Reroll seal, the
// skill and its old and new damage type, since the new type is the news.
// Mounted once in AppShell beside the enchant reveal; useServices holds it.
// Item slots and Overdrive, done just as asked, show a toast instead.
const { done, dismissDone } = useServices();
const { serviceDoneVisible } = useModalPriority();
const baseUrl = import.meta.env.BASE_URL;

const DAMAGE_TYPES: Record<DamageType, { label: string; icon: StatIconName }> = {
  physical: { label: 'Physical', icon: 'physical' },
  magic: { label: 'Magic', icon: 'magic' },
  healing: { label: 'Healing', icon: 'healing' },
  trueDamage: { label: 'True damage', icon: 'true' },
};
</script>

<template>
  <Modal :model-value="serviceDoneVisible" :dismissible="false" title="Rerolled!" max-width="420px">
    <div v-if="done" class="service-done">
      <img class="service-done-seal" :src="`${baseUrl}sprites/services/${done.id}.png`" alt="" />
      <p class="service-done-name">{{ done.habitName }}</p>
      <p class="service-done-change">
        <span class="service-done-type"><StatIcon :name="DAMAGE_TYPES[done.from].icon" :size="16" />{{ DAMAGE_TYPES[done.from].label }}</span>
        →
        <span class="service-done-type"><StatIcon :name="DAMAGE_TYPES[done.to].icon" :size="16" />{{ DAMAGE_TYPES[done.to].label }}</span>
      </p>
      <button type="button" class="ok primary-button" @click="dismissDone">Nice!</button>
    </div>
  </Modal>
</template>

<style scoped>
.service-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

/* The 32x32 seal at 2 CSS px per art pixel. */
.service-done-seal {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  margin-bottom: 4px;
}

.service-done-name,
.service-done-change {
  margin: 0;
}

.service-done-name {
  font-family: var(--serif);
  font-weight: 700;
  font-size: 1.1rem;
}

.service-done-change {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.service-done-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ok {
  display: block;
  width: 100%;
  margin-top: 0.75rem;
}
</style>
