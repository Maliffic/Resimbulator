// tests/poe-clipboard/header.test.ts
import { describe, it, expect } from 'vitest';
import { parseHeader } from '../../src/lib/poe-clipboard/header.js';

describe('parseHeader', () => {
  it('parses a rare item header (4 lines: class, rarity, name, base)', () => {
    const h = parseHeader([
      'Item Class: Body Armours',
      'Rarity: Rare',
      'Cataclysm Veil',
      'Sacrificial Garb',
    ]);
    expect(h.rarity).toBe('Rare');
    expect(h.itemClass).toBe('Body Armours');
    expect(h.name).toBe('Cataclysm Veil');
    expect(h.base).toBe('Sacrificial Garb');
  });

  it('parses a magic item header (3 lines: class, rarity, magic name)', () => {
    const h = parseHeader([
      'Item Class: Wands',
      'Rarity: Magic',
      "Tyrannical Opal Wand of the Order",
    ]);
    expect(h.rarity).toBe('Magic');
    expect(h.itemClass).toBe('Wands');
    expect(h.name).toBe('Tyrannical Opal Wand of the Order');
    expect(h.base).toBe('Tyrannical Opal Wand of the Order');
  });

  it('parses a normal item header (3 lines: class, rarity, name=base)', () => {
    const h = parseHeader([
      'Item Class: Body Armours',
      'Rarity: Normal',
      'Sacrificial Garb',
    ]);
    expect(h.rarity).toBe('Normal');
    expect(h.itemClass).toBe('Body Armours');
    expect(h.name).toBe('Sacrificial Garb');
    expect(h.base).toBe('Sacrificial Garb');
  });

  it('parses a unique item header', () => {
    const h = parseHeader([
      'Item Class: Body Armours',
      'Rarity: Unique',
      "Kaom's Heart",
      'Glorious Plate',
    ]);
    expect(h.rarity).toBe('Unique');
    expect(h.name).toBe("Kaom's Heart");
    expect(h.base).toBe('Glorious Plate');
  });

  it('throws on missing Rarity line', () => {
    expect(() => parseHeader(['Item Class: Body Armours', 'Foo'])).toThrow(/Rarity/);
  });

  it('throws on unknown rarity', () => {
    expect(() =>
      parseHeader(['Item Class: Body Armours', 'Rarity: Mythical', 'Foo']),
    ).toThrow(/rarity/i);
  });
});
