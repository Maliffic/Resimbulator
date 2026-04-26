// tests/ui/state.test.ts
import { describe, it, expect } from 'vitest';
import {
  createEmptyState, setItem, toggleDesired, reset, allDesiredMods, computeChance,
} from '../../src/lib/ui/state.js';
import type { Item } from '../../src/lib/recombinator/index.js';

const sampleItem = (id: string): Item => ({
  id, base: 'Sacrificial Garb', itemClass: 'Body Armours', itemLevel: 86,
  attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'],
  influence: undefined, corrupted: false, synthesised: false,
  implicits: [],
  prefixes: [{
    id: 'p1', affix: 'prefix', category: 'RegularExplicit', name: 'p1', tier: 1, statText: '', desired: true,
  }],
  suffixes: [],
});

describe('state helpers', () => {
  it('createEmptyState returns null items + default settings', () => {
    const s = createEmptyState();
    expect(s.item1).toBeNull();
    expect(s.item2).toBeNull();
    expect(s.settings.batchSimTrials).toBe(1000);
  });

  it('setItem replaces a slot', () => {
    const s = createEmptyState();
    setItem(s, 1, sampleItem('a'));
    expect(s.item1?.id).toBe('a');
    expect(s.item2).toBeNull();
  });

  it('toggleDesired flips the desired flag on a mod', () => {
    const s = createEmptyState();
    setItem(s, 1, sampleItem('a'));
    expect(s.item1?.prefixes[0]?.desired).toBe(true);
    toggleDesired(s, 'a', 'p1');
    expect(s.item1?.prefixes[0]?.desired).toBe(false);
    toggleDesired(s, 'a', 'p1');
    expect(s.item1?.prefixes[0]?.desired).toBe(true);
  });

  it('reset clears both items', () => {
    const s = createEmptyState();
    setItem(s, 1, sampleItem('a'));
    setItem(s, 2, sampleItem('b'));
    reset(s);
    expect(s.item1).toBeNull();
    expect(s.item2).toBeNull();
  });

  it('allDesiredMods collects desired mods from both items', () => {
    const s = createEmptyState();
    setItem(s, 1, sampleItem('a'));
    setItem(s, 2, sampleItem('b'));
    expect(allDesiredMods(s)).toHaveLength(2);
  });

  it('computeChance returns 0 when one slot is empty', () => {
    const s = createEmptyState();
    setItem(s, 1, sampleItem('a'));
    expect(computeChance(s)).toBe(0);
  });

  it('computeChance returns 1 when no desired mods are marked', () => {
    const s = createEmptyState();
    const a = sampleItem('a');
    const b = sampleItem('b');
    a.prefixes[0]!.desired = false;
    b.prefixes[0]!.desired = false;
    setItem(s, 1, a);
    setItem(s, 2, b);
    expect(computeChance(s)).toBe(1);
  });
});
