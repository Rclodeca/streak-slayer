// A quiet note at the foot of the screen that goes on its own
// (docs/mockups/potion-toast.html, A): what a potion, an Item slot or an
// Overdrive just did, so nothing has to be tapped away. Module-scoped like the
// other popups' state, so GameToast (mounted once in AppShell) shows whatever
// was last sent; a new note replaces the one up and restarts its time.

import { ref } from 'vue';
import type { StatIconName } from '../components/ui/statIcons';

export interface Toast {
  /** A sprite under public/sprites/ (a potion, a service's seal). */
  art?: string;
  /** A stat icon in the art's place (a task's EXP), when there's no sprite. */
  icon?: StatIconName;
  title: string;
  text: string;
  /** The text's colour and the draining line's, a CSS colour. */
  tone: string;
  /** Bumped per note, so the same note twice still replays. */
  key: number;
}

/** How long a note stays up, in ms. */
export const TOAST_MS = 2800;

const current = ref<Toast | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let count = 0;

export function useToast() {
  function show(toast: Omit<Toast, 'key'>): void {
    if (timer) clearTimeout(timer);
    count += 1;
    current.value = { ...toast, key: count };
    timer = setTimeout(dismiss, TOAST_MS);
  }

  function dismiss(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    current.value = null;
  }

  return { current, show, dismiss };
}
