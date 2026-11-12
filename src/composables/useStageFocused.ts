import { computed } from 'vue';
import { useFocusModeStore } from '../store/focusModeStore';

/**
 * Whether the fight stage is the 76px Focus strip: the menu's Focus mode. (The phone's
 * Hero and Talents tabs show no stage: the home base and the tree take the top.)
 */
export function useStageFocused() {
  const focusMode = useFocusModeStore();
  return computed(() => focusMode.on);
}
