<script setup lang="ts">
// Generic, reusable modal shell — no domain knowledge of character/boss/habit
// state lives here. Consumers pass their content via the default slot and
// control visibility via the `modelValue` prop (v-model:modelValue / v-model).

import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { lockBodyScroll } from '../../composables/useBodyScrollLock';

// `sheet`: docked to the bottom of the screen, full width, sliding up as it
// opens and down as it closes; dragging its grab bar down far enough closes
// it too (the phone's log, docs/mockups/pixel-tabs-final.html).
const props = withDefaults(defineProps<{ modelValue: boolean; title?: string; dismissible?: boolean; maxWidth?: string; scrollKey?: unknown; sheet?: boolean }>(), {
  dismissible: true,
  maxWidth: '420px',
});
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

// Keep the page behind the backdrop from scrolling while the modal is open.
let releaseScrollLock: (() => void) | null = null;
function unlock() {
  releaseScrollLock?.();
  releaseScrollLock = null;
}
watch(
  () => props.modelValue,
  (open) => {
    if (open && !releaseScrollLock) releaseScrollLock = lockBodyScroll();
    else if (!open) unlock();
  },
  { immediate: true },
);
onBeforeUnmount(unlock);

// A popup that shows queued entries one after another passes the entry as
// `scrollKey`, so each new one opens at the top, not where the last was left.
const scrollEl = ref<HTMLElement | null>(null);
watch(
  () => props.scrollKey,
  () => {
    if (scrollEl.value) scrollEl.value.scrollTop = 0;
  },
  { flush: 'post' },
);

function close() {
  if (!props.dismissible) return;
  emit('update:modelValue', false);
}

// How far the sheet has been dragged down. A drag past SHEET_CLOSE_PX closes
// it, sliding on down from there; a shorter one springs back.
const SHEET_CLOSE_PX = 90;
const drag = ref(0);
const dragging = ref(false);
let dragFrom = 0;

function startDrag(event: PointerEvent) {
  if (!props.dismissible) return;
  dragFrom = event.clientY;
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (dragging.value) drag.value = Math.max(0, event.clientY - dragFrom);
}

// The sheet eases again before it closes, so it slides on down from where it was let go.
function endDrag() {
  if (!dragging.value) return;
  dragging.value = false;
  if (drag.value > SHEET_CLOSE_PX) nextTick(close);
  else drag.value = 0;
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) drag.value = 0;
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet" :css="sheet">
      <div v-if="modelValue" class="modal-backdrop" :class="{ sheet }" @click="close">
        <div
          class="modal-content"
          :class="{ 'has-footer': $slots.footer, sheet, dragging }"
          :style="sheet ? { '--drag': `${drag}px` } : { maxWidth }"
          @click.stop
        >
          <div v-if="sheet" class="sheet-grab" aria-hidden="true" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" />
          <div ref="scrollEl" class="modal-scroll">
            <div class="modal-header">
              <h3 v-if="title">{{ title }}</h3>
              <button v-if="dismissible" type="button" class="modal-close" aria-label="Close" @click="close">×</button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
  overscroll-behavior: contain;
}

.modal-content {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
}

/* The frame never scrolls, only the header and body do, so anything drawn on
   the frame (a theme's corner brackets) stays locked to its border. A footer
   stays pinned to the bottom edge. */
.modal-scroll {
  min-height: 0;
  padding: 1rem 1.25rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.has-footer .modal-scroll {
  padding-bottom: 0.75rem;
}

.modal-footer {
  flex-shrink: 0;
  padding: 0.75rem 1.25rem 1rem;
  border-top: 1px solid var(--border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.modal-header h3 {
  margin: 0;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.2em 0.4em;
  cursor: pointer;
}

/* The sheet: the screen's full width along its bottom, clear of the home
   indicator, with a grab bar along its top. */
.modal-backdrop.sheet {
  align-items: flex-end;
  padding: 0;
}

.modal-content.sheet {
  height: 64vh;
  height: 64dvh;
  max-height: none;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-radius: 12px 12px 0 0;
  transform: translateY(var(--drag, 0px));
  transition: transform 0.2s ease;
}

.modal-content.sheet.dragging {
  transition: none;
}

.sheet.modal-content .modal-scroll {
  flex: 1;
  padding-top: 0;
}

.sheet-grab {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  height: 22px;
  cursor: grab;
  touch-action: none;
}

.sheet-grab::before {
  content: '';
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: background-color 0.25s ease;
}

.sheet-enter-active .modal-content,
.sheet-leave-active .modal-content {
  transition: transform 0.25s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  background-color: transparent;
}

.sheet-enter-from .modal-content,
.sheet-leave-to .modal-content {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .modal-content,
  .sheet-leave-active .modal-content {
    transition: none;
  }
}
</style>
