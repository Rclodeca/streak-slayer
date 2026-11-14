import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Ref } from 'vue';

/**
 * Centres a backdrop `artWidth` CSS px wide in its frame by a whole-px offset,
 * so a phone narrower than the art crops both sides evenly and, on an odd
 * width, the art pixels still land on whole device pixels. `frame` is the
 * cropping box's template ref; the returned offset is the art's left.
 */
export function useCenteredArt(frame: Ref<HTMLElement | null>, artWidth: number): Ref<number> {
  const offset = ref(0);
  let observer: ResizeObserver | null = null;

  function place() {
    const width = frame.value?.clientWidth ?? artWidth;
    offset.value = Math.floor((width - artWidth) / 2);
  }

  onMounted(() => {
    place();
    if (typeof ResizeObserver === 'function' && frame.value) {
      observer = new ResizeObserver(place);
      observer.observe(frame.value);
    }
  });
  onBeforeUnmount(() => observer?.disconnect());

  return offset;
}
