// src/lib/ui/persist.ts
import type { Item } from '$lib/recombinator/index.js';

const KEY = 'resimbulator:state:v1';

export type PersistedState = {
  item1: Item | null;
  item2: Item | null;
};

export function saveState(state: PersistedState, storage: Storage): void {
  try {
    storage.setItem(KEY, JSON.stringify({ schemaVersion: 1, ...state }));
  } catch {
    // Storage may be full or disabled; silently ignore.
  }
}

export function loadState(storage: Storage): PersistedState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { item1: null, item2: null };
    const parsed = JSON.parse(raw) as PersistedState & { schemaVersion?: number };
    return { item1: parsed.item1 ?? null, item2: parsed.item2 ?? null };
  } catch {
    return { item1: null, item2: null };
  }
}
