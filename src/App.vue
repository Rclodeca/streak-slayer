<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppShell from './components/layout/AppShell.vue';
import { useCombatActions } from './composables/useCombatActions';
import { useDailyRollover } from './composables/useDailyRollover';
import { useRolloverWatch } from './composables/useRolloverWatch';
import { useDebugClockStore } from './store/debugClockStore';

// Runs once per app load: checks every habit against the period boundary it
// crossed since the last time the app was open, and records a miss for any
// habit that wasn't completed in the immediately-preceding period.
// useRolloverWatch repeats that check if the day turns over while it stays open.
// A hero who fell and closed the app before rising gets the death screen back.
let stopRolloverWatch: (() => void) | undefined;
onMounted(() => {
  useDailyRollover(useDebugClockStore().now());
  useCombatActions().raiseDeathIfFallen();
  stopRolloverWatch = useRolloverWatch();
});
onUnmounted(() => stopRolloverWatch?.());
</script>

<template>
  <AppShell />
</template>
