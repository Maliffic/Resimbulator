// tests/poe-clipboard/mod-block.test.ts
import { describe, it, expect } from 'vitest';
import { parseModSection } from '../../src/lib/poe-clipboard/mod-block.js';

describe('parseModSection (with type hints)', () => {
  it('parses a single prefix mod with hint', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage, Attack, Physical }',
      '166% increased Physical Damage',
    ]);
    expect(mods).toHaveLength(1);
    expect(mods[0]?.affix).toBe('prefix');
    expect(mods[0]?.hint?.name).toBe('Tyrannical');
    expect(mods[0]?.hint?.tier).toBe(1);
    expect(mods[0]?.hint?.tags).toEqual(['Damage', 'Attack', 'Physical']);
    expect(mods[0]?.hint?.flags).toEqual([]);
    expect(mods[0]?.statLines).toEqual(['166% increased Physical Damage']);
  });

  it('parses a Crafted mod', () => {
    const mods = parseModSection([
      '{ Crafted Suffix Modifier "of Crafting" (Tier: 1) — Caster, Skill }',
      '+1 to Level of Socketed Gems',
    ]);
    expect(mods[0]?.affix).toBe('suffix');
    expect(mods[0]?.hint?.flags).toContain('crafted');
  });

  it('parses a Veiled mod', () => {
    const mods = parseModSection([
      '{ Veiled Prefix }',
      'Veiled Prefix',
    ]);
    expect(mods[0]?.hint?.flags).toContain('veiled');
  });

  it('parses a Fractured mod', () => {
    const mods = parseModSection([
      '{ Fractured Modifier "Mage King\'s" (Tier: 4) — Defences, Caster }',
      '+15 to maximum Mana',
    ]);
    expect(mods[0]?.hint?.flags).toContain('fractured');
  });

  it('parses an untiered essence mod (no Tier: line)', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Essence Plating" — Defences }',
      'Adds 50 to 100 Armour',
    ]);
    expect(mods[0]?.hint?.tier).toBeNull();
    expect(mods[0]?.hint?.tags).toEqual(['Defences']);
  });

  it('parses an Implicit mod', () => {
    const mods = parseModSection([
      '{ Implicit Modifier — Life }',
      '+22 to maximum Life (implicit)',
    ]);
    expect(mods[0]?.affix).toBe('implicit');
    expect(mods[0]?.hint?.flags).toContain('implicit');
  });

  it('parses multi-line stat blocks (mod with two stat lines)', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Hyperborean" (Tier: 1) — Cold, Damage }',
      'Adds 1 to 2 Cold Damage to Attacks',
      '+10 to Cold Damage',
    ]);
    expect(mods[0]?.statLines).toHaveLength(2);
  });

  it('parses multiple mods in one section', () => {
    const mods = parseModSection([
      '{ Prefix Modifier "Tyrannical" (Tier: 1) — Damage }',
      '166% increased Physical Damage',
      '{ Suffix Modifier "of Insulation" (Tier: 5) — Resistance }',
      '+19% to Cold Resistance',
    ]);
    expect(mods).toHaveLength(2);
    expect(mods[0]?.affix).toBe('prefix');
    expect(mods[1]?.affix).toBe('suffix');
  });
});

describe('parseModSection (no type hints)', () => {
  it('falls back to stat-line-only mods, marking inline (implicit)/(fractured)', () => {
    const mods = parseModSection([
      '+22 to maximum Life (implicit)',
      '166% increased Physical Damage',
      '+15 to maximum Mana (fractured)',
    ]);
    expect(mods).toHaveLength(3);
    expect(mods[0]?.affix).toBe('implicit');
    expect(mods[0]?.hint).toBeUndefined();
    expect(mods[1]?.affix).toBe('unknown');
    expect(mods[1]?.hint).toBeUndefined();
    expect(mods[2]?.affix).toBe('unknown');
    expect(mods[2]?.hint).toBeUndefined();
    expect(mods[2]?.statLines[0]).toContain('(fractured)');
  });
});
