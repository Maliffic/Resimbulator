// tests/ui/persist.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState } from '../../src/lib/ui/persist.js';
import type { Item } from '../../src/lib/recombinator/index.js';

const sampleItem = (id: string): Item => ({
  id, base: 'X', itemClass: 'Y', itemLevel: 86,
  attributeBase: 'str', defenceTags: ['armour'],
  influence: undefined, corrupted: false, synthesised: false,
  implicits: [], prefixes: [], suffixes: [],
});

const fakeStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
};

describe('persist', () => {
  let storage: Storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it('round-trips empty state', () => {
    saveState({ item1: null, item2: null }, storage);
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
    expect(loaded.item2).toBeNull();
  });

  it('round-trips a populated state', () => {
    const it = sampleItem('a');
    saveState({ item1: it, item2: null }, storage);
    const loaded = loadState(storage);
    expect(loaded.item1?.id).toBe('a');
    expect(loaded.item2).toBeNull();
  });

  it('returns empty state on missing key', () => {
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
    expect(loaded.item2).toBeNull();
  });

  it('returns empty state on corrupt JSON', () => {
    storage.setItem('Resimbinator :state:v1', 'not json');
    const loaded = loadState(storage);
    expect(loaded.item1).toBeNull();
  });
});
