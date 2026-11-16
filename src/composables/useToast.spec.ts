import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_MS, useToast } from './useToast';

const note = { art: 'potions/health', title: 'Health Potion', text: '+600 HP', tone: 'green' };

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    useToast().dismiss();
    vi.useRealTimers();
  });

  it('shows a note and takes it down on its own', () => {
    const { current, show } = useToast();
    show(note);
    expect(current.value).toMatchObject(note);
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(current.value).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(current.value).toBeNull();
  });

  it('a new note replaces the one up and restarts its time', () => {
    const { current, show } = useToast();
    show(note);
    const first = current.value!.key;
    vi.advanceTimersByTime(TOAST_MS - 500);
    show({ ...note, title: 'Crit Potion' });
    expect(current.value).toMatchObject({ title: 'Crit Potion' });
    expect(current.value!.key).not.toBe(first);
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(current.value).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(current.value).toBeNull();
  });
});
