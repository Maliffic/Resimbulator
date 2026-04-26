// tests/ui/url-state.test.ts
import { describe, it, expect } from 'vitest';
import { encodeStateToUrl, decodeStateFromUrl } from '../../src/lib/ui/url-state.js';
import type { Item } from '../../src/lib/recombinator/index.js';

const sampleItem = (id: string): Item => ({
  id, base: 'Sacrificial Garb', itemClass: 'Body Armours', itemLevel: 86,
  attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'],
  influence: undefined, corrupted: false, synthesised: false,
  implicits: [],
  prefixes: [{ id: 'p1', affix: 'prefix', category: 'RegularExplicit', name: 'P1', tier: 1, statText: '+# Damage' }],
  suffixes: [],
});

describe('url-state', () => {
  it('encodes and decodes a non-empty state', () => {
    const state = { item1: sampleItem('a'), item2: sampleItem('b') };
    const encoded = encodeStateToUrl(state);
    expect(encoded).toBeTypeOf('string');
    expect(encoded.length).toBeLessThan(2000);
    const decoded = decodeStateFromUrl(encoded);
    expect(decoded.item1?.id).toBe('a');
    expect(decoded.item2?.id).toBe('b');
    expect(decoded.item1?.prefixes[0]?.name).toBe('P1');
  });

  it('round-trips empty state', () => {
    const encoded = encodeStateToUrl({ item1: null, item2: null });
    const decoded = decodeStateFromUrl(encoded);
    expect(decoded.item1).toBeNull();
    expect(decoded.item2).toBeNull();
  });

  it('throws on garbled input', () => {
    expect(() => decodeStateFromUrl('not-base64-deflate')).toThrow();
  });
});
