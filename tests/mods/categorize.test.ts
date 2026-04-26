// tests/mods/categorize.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { categorize } from '../../src/lib/mods/categorize.js';
import { loadModDb } from '../../src/lib/mods/mod-db-loader.js';
import type { ParsedMod } from '../../src/lib/poe-clipboard/index.js';

const FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/mods/fixture-mod-db.json',
);
const db = loadModDb(JSON.parse(readFileSync(FIXTURE, 'utf8')));

const mod = (overrides: Partial<ParsedMod> & Pick<ParsedMod, 'affix'>): ParsedMod => ({
  statLines: [],
  ...overrides,
});

describe('categorize', () => {
  it('classifies an implicit by parser affix', () => {
    const r = categorize(mod({ affix: 'implicit', statLines: ['+25 to maximum Life (implicit)'] }), db, 'host_a');
    expect(r.category).toBe('Implicit');
  });

  it('classifies a fractured mod and sets hostItemId', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Plated', tier: 1, tags: ['defences'], flags: ['fractured'] },
      statLines: ['100% increased Armour (fractured)'],
    }), db, 'host_a');
    expect(r.category).toBe('Fractured');
    expect(r.hostItemId).toBe('host_a');
  });

  it('classifies a crafted mod', () => {
    const r = categorize(mod({
      affix: 'suffix',
      hint: { name: 'of Crafting', tier: 1, tags: [], flags: ['crafted'] },
      statLines: [],
    }), db, 'host_a');
    expect(r.category).toBe('ExclusiveCrafted');
  });

  it('classifies a breach mod by mod-DB domain lookup', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Breach', tier: 1, tags: ['breach'], flags: [] },
      statLines: ['+50 armour overcapped fire'],
    }), db, 'host_a');
    expect(r.category).toBe('ExclusiveBreach');
  });

  it('classifies a beast aspect by name pattern', () => {
    const r = categorize(mod({
      affix: 'suffix',
      hint: { name: 'Aspect of the Spider', tier: 1, tags: ['aspect'], flags: [] },
      statLines: [],
    }), db, 'host_a');
    expect(r.category).toBe('ExclusiveBeastAspect');
  });

  it('classifies an essence mod (untiered) by mod-DB lookup', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Essence Plating', tier: null, tags: ['defences'], flags: [] },
      statLines: ['Adds 50 to 100 Armour'],
    }), db, 'host_a');
    expect(r.category).toBe('ExclusiveEssence');
  });

  it('classifies a Warlord influenced mod and sets requiresInfluence', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Empowering', tier: 1, tags: ['influence'], flags: [] },
      statLines: ['+30% to Critical Strike Multiplier'],
    }), db, 'host_a');
    expect(r.category).toBe('NNN_Influenced');
    expect(r.requiresInfluence).toBe('warlord');
  });

  it('classifies an armour-only mod and sets requiresDefenceTag', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Plated', tier: 1, tags: ['defences'], flags: [] },
      statLines: ['100% increased Armour'],
    }), db, 'host_a');
    expect(r.category).toBe('NNN_Defence');
    expect(r.requiresDefenceTag).toBe('armour');
  });

  it('classifies a str-base-only mod and sets allowedAttributeBases', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Hale', tier: 1, tags: ['life'], flags: [] },
      statLines: ['1.5% of Life Regenerated per second'],
    }), db, 'host_a');
    expect(r.category).toBe('NNN_Attribute');
    expect(r.allowedAttributeBases).toEqual(['str', 'str_int', 'str_dex']);
  });

  it('classifies a regular damage mod as RegularExplicit', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Tyrannical', tier: 1, tags: ['damage', 'attack', 'physical'], flags: [] },
      statLines: ['166% increased Physical Damage'],
    }), db, 'host_a');
    expect(r.category).toBe('RegularExplicit');
  });

  it('falls back to RegularExplicit when no mod-DB entry is found', () => {
    const r = categorize(mod({
      affix: 'prefix',
      hint: { name: 'Mystery Mod', tier: 1, tags: [], flags: [] },
      statLines: ['+1 to mystery'],
    }), db, 'host_a');
    expect(r.category).toBe('RegularExplicit');
  });
});
