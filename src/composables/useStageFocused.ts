import { computed } from 'vue';
import { useFocusModeStore } from '../store/focusModeStore';
import { STRIP_TABS, useTabStore } from '../store/tabStore';
import { usePhoneLayout } from './usePhoneLayout';

/**
 * Whether the fight stage is the 76px Focus strip: the menu's Focus mode, or on
 * a phone the Hero and Talents tabs (STRIP_TABS).
 */
export function useStageFocused() {
  const focusMode = useFocusModeStore();
  const isPhone = usePhoneLayout();
  const tabStore = useTabStore();
  return computed(() => focusMode.on || (isPhone.value && STRIP_TABS.includes(tabStore.tab)));
}
