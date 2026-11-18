<script setup lang="ts">
import { usePhoneLayout } from '../../composables/usePhoneLayout';
import Modal from '../ui/Modal.vue';
import TrialList from './TrialList.vue';

// Trials: the game's sets of deeds that pay gems (game-engine/trials.ts), every
// one live from level 1. A modal over the app, opened from the stage's Trials
// button or the menu: a tall sheet on a phone, a centred panel on wider screens
// (docs/mockups/trial-sets-2.html). The game sets them, so there's no add button.

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const isPhone = usePhoneLayout();
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="Trials"
    :sheet="isPhone"
    tall
    max-width="460px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <TrialList />
  </Modal>
</template>
