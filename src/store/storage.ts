// The one place the stores read and write persisted strings. It is
// localStorage today; keeping every store behind this wrapper means it can be
// swapped for native storage (Capacitor Preferences) without touching them.
// Synchronous on purpose: stores hydrate at startup and write on every change.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let backend: KeyValueStorage | null = null;

/** Swaps the storage behind `storage`; null goes back to localStorage. */
export function setStorageBackend(next: KeyValueStorage | null): void {
  backend = next;
}

function current(): KeyValueStorage {
  return backend ?? localStorage;
}

export const storage: KeyValueStorage = {
  getItem: (key) => current().getItem(key),
  setItem: (key, value) => current().setItem(key, value),
  removeItem: (key) => current().removeItem(key),
};
