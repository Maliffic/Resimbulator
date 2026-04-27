// tests/mods/base-db.test.ts
import { describe, it, expect } from 'vitest';
import { BASE_DB, lookupBase } from '../../src/lib/mods/base-db.js';

describe('BASE_DB curation', () => {
  it('contains entries for common crafting bases', () => {
    expect(lookupBase('Sacrificial Garb')).toEqual({
      name: 'Sacrificial Garb',
      itemClass: 'Body Armours',
      attributeBase: 'str_int',
      defenceTags: ['armour', 'energy_shield'],
    });
    expect(lookupBase('Astral Plate')?.attributeBase).toBe('str');
    expect(lookupBase('Vaal Regalia')?.attributeBase).toBe('int');
    expect(lookupBase('Carnal Armour')?.attributeBase).toBe('dex_int');
  });

  it('returns undefined for unknown bases', () => {
    expect(lookupBase('Nonexistent Base XYZ')).toBeUndefined();
  });

  it('all entries have a valid attributeBase', () => {
    const valid = new Set(['str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int', 'pure']);
    for (const base of BASE_DB.values()) {
      expect(valid.has(base.attributeBase)).toBe(true);
    }
  });

  it('all entries have at least one defence tag (or it is intentionally empty for jewellery/wands)', () => {
    const noDefenceClasses = new Set(['Wands', 'Rings', 'Amulets', 'Belts', 'Quivers', 'Sceptres', 'Daggers']);
    for (const base of BASE_DB.values()) {
      if (noDefenceClasses.has(base.itemClass)) continue;
      expect(base.defenceTags.length).toBeGreaterThan(0);
    }
  });
});
