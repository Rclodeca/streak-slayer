// Whether the phone layout is showing: 820px wide and under, the CSS's
// breakpoint, where the stage is pinned over the lists and the bottom tab bar
// picks which list shows (TabBar). Follows the window as it resizes. Without
// matchMedia (the tests' jsdom) it's the desktop layout.

import { onScopeDispose, ref } from 'vue';
import type { Ref } from 'vue';

export const PHONE_QUERY = '(max-width: 820px)';

export function usePhoneLayout(): Readonly<Ref<boolean>> {
  const isPhone = ref(false);
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;
  if (query) {
    isPhone.value = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      isPhone.value = event.matches;
    };
    query.addEventListener('change', onChange);
    onScopeDispose(() => query.removeEventListener('change', onChange));
  }
  return isPhone;
}
