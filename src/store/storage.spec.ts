// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setStorageBackend, storage } from './storage';
import type { KeyValueStorage } from './storage';

function fakeBackend(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => setStorageBackend(null));

  it('reads, writes and removes through localStorage by default', () => {
    storage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(localStorage.getItem('k')).toBeNull();
    expect(storage.getItem('k')).toBeNull();
  });

  it('goes through a swapped-in backend instead of localStorage', () => {
    const backend = fakeBackend();
    setStorageBackend(backend);
    storage.setItem('k', 'v');
    expect(backend.data.get('k')).toBe('v');
    expect(localStorage.getItem('k')).toBeNull();
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(backend.data.has('k')).toBe(false);
  });

  it('returns to localStorage when the backend is cleared', () => {
    setStorageBackend(fakeBackend());
    setStorageBackend(null);
    storage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
  });
});
