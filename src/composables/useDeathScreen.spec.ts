import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeathScreen } from './useDeathScreen';

describe('useDeathScreen', () => {
  // `isDead` is a module-scope singleton, shared across every call to
  // useDeathScreen() (by design — see the composable's comment) — so it
  // also persists across `it()` blocks in this file. Reset it after each.
  afterEach(() => {
    useDeathScreen().dismiss();
    vi.useRealTimers();
  });

  it('starts false', () => {
    const { isDead } = useDeathScreen();
    expect(isDead.value).toBe(false);
  });

  it('triggerDeath sets isDead true', () => {
    const { isDead, triggerDeath } = useDeathScreen();
    triggerDeath();
    expect(isDead.value).toBe(true);
  });

  it('is revealed at once, unless the fall is held back for a hit still landing', () => {
    vi.useFakeTimers();
    const { isDead, revealed, triggerDeath } = useDeathScreen();
    triggerDeath();
    expect(revealed.value).toBe(true);
    useDeathScreen().dismiss();
    triggerDeath(900);
    expect(isDead.value).toBe(true);
    expect(revealed.value).toBe(false);
    vi.advanceTimersByTime(899);
    expect(revealed.value).toBe(false);
    vi.advanceTimersByTime(1);
    expect(revealed.value).toBe(true);
  });

  it('dismissing before a held-back fall is revealed cancels the reveal', () => {
    vi.useFakeTimers();
    const { revealed, triggerDeath, dismiss } = useDeathScreen();
    triggerDeath(900);
    dismiss();
    vi.advanceTimersByTime(2000);
    expect(revealed.value).toBe(false);
  });

  it('dismiss sets isDead back to false', () => {
    const { isDead, triggerDeath, dismiss } = useDeathScreen();
    triggerDeath();
    dismiss();
    expect(isDead.value).toBe(false);
  });

  it('is shared across separate calls to useDeathScreen()', () => {
    const first = useDeathScreen();
    const second = useDeathScreen();
    first.triggerDeath();
    expect(second.isDead.value).toBe(true);
  });

  it('triggerPreview opens the screen as a preview, and dismiss ends both', () => {
    const { isDead, isPreview, triggerPreview, dismiss } = useDeathScreen();
    triggerPreview();
    expect(isDead.value).toBe(true);
    expect(isPreview.value).toBe(true);
    dismiss();
    expect(isDead.value).toBe(false);
    expect(isPreview.value).toBe(false);
  });

  it('a real death is no preview', () => {
    const { isPreview, triggerDeath } = useDeathScreen();
    triggerDeath();
    expect(isPreview.value).toBe(false);
  });
});
