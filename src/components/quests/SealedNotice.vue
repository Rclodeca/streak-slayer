<script setup lang="ts">
import { Lock } from 'lucide-vue-next';

// Quests and Trials each seal until their own level.
defineProps<{ level: number }>();
</script>

<template>
  <!-- Quests or Trials, sealed until `level`: two blurred placeholder rows under a lock. -->
  <div class="lock-area">
    <div class="lock-ghost" aria-hidden="true"><i /><i /></div>
    <div class="lock-seal">
      <span class="lock-mark"><Lock :size="18" /></span>
      <p class="lock-text">Sealed until level {{ level }}</p>
    </div>
  </div>
</template>

<style scoped>
.lock-area {
  position: relative;
  margin-top: 0;
}

.lock-ghost {
  display: grid;
  gap: 0.5rem;
  opacity: 0.35;
  filter: blur(2px);
}

.lock-ghost i {
  display: block;
  height: 3rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.lock-seal {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.lock-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 50%;
}

.lock-text {
  margin: 0;
  color: var(--text);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
