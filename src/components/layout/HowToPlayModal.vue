<script setup lang="ts">
import { Flame, HeartCrack, ScrollText, Shield, Sparkles, Sword } from 'lucide-vue-next';
import Modal from '../ui/Modal.vue';

// The menu's How to play: the core loop in six lines (option 1 Plain,
// docs/mockups/how-to-play-oath.html). Each icon well wears its line's colour.
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const LINES = [
  { icon: Sword, color: 'var(--dmg-physical)', title: 'Check off a habit', text: 'Your hero strikes the boss.' },
  { icon: HeartCrack, color: 'var(--damage-color)', title: 'Miss a habit', text: 'When the day ends, the boss strikes you.' },
  { icon: Flame, color: 'var(--brass)', title: 'Keep a streak', text: 'Every day in a row, that habit hits harder. Miss once and it starts over.' },
  { icon: Shield, color: 'var(--icon-steel)', title: 'Resist bad habits', text: 'Make it through the day without one and you strike the boss. Give in and it strikes you.' },
  { icon: ScrollText, color: 'var(--icon-exp)', title: 'Finish tasks', text: 'One-time to-dos. Done by the due date, they earn EXP.' },
  { icon: Sparkles, color: 'var(--dmg-healing)', title: 'Grow stronger', text: 'Each habit kept and task done makes your hero stronger. Get better in life, get stronger here.' },
];
</script>

<template>
  <Modal :model-value="modelValue" title="How to play" max-width="400px" @update:model-value="emit('update:modelValue', $event)">
    <p class="eyebrow">Every habit is a weapon</p>
    <ul class="lines">
      <li v-for="line in LINES" :key="line.title" :style="{ '--c': line.color }">
        <span class="well"><component :is="line.icon" :size="17" aria-hidden="true" /></span>
        <div>
          <b>{{ line.title }}</b>
          <span>{{ line.text }}</span>
        </div>
      </li>
    </ul>
    <button type="button" class="to-battle primary-button" @click="emit('update:modelValue', false)">To battle</button>
  </Modal>
</template>

<style scoped>
.eyebrow {
  margin: -0.25rem 0 0;
  color: var(--brass);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-align: center;
  text-transform: uppercase;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.lines li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.well {
  flex: none;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, var(--field));
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c) 65%, #000);
  clip-path: var(--px2);
}

.lines b {
  display: block;
  color: var(--text-h);
  font-family: var(--serif);
  font-size: 1.05rem;
  line-height: 1.15;
}

.lines div span {
  display: block;
  margin-top: 2px;
  color: var(--text);
  font-size: 0.88rem;
  line-height: 1.35;
}

.to-battle {
  display: block;
  width: 100%;
  min-height: 46px;
  margin-top: 1.2rem;
}
</style>
