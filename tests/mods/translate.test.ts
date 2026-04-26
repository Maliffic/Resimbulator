// tests/mods/translate.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { translate } from '../../src/lib/mods/translate.js';
import { loadModDb } from '../../src/lib/mods/mod-db-loader.js';
import { parse } from '../../src/lib/poe-clipboard/index.js';

const FIXTURE_DB = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/mods/fixture-mod-db.json',
);
const FIXTURE_CLIPBOARD = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/clipboard/rare-with-hints.txt',
);
const db = loadModDb(JSON.parse(readFileSync(FIXTURE_DB, 'utf8')));

describe('translate', () => {
  it('produces an engine Item from a ParsedItem with type hints', () => {
    const text = readFileSync(FIXTURE_CLIPBOARD, 'utf8');
    const parsed = parse(text);
    const item = translate(parsed, db);

    expect(item.id).toBeTypeOf('string');
    expect(item.id.length).toBeGreaterThan(0);
    expect(item.base).toBe('Sacrificial Garb');
    expect(item.attributeBase).toBe('str_int');
    expect(item.defenceTags).toEqual(['armour', 'energy_shield']);
    expect(item.itemLevel).toBe(86);

    expect(item.prefixes).toHaveLength(2);
    expect(item.prefixes[0]?.category).toBe('RegularExplicit');
    expect(item.prefixes[0]?.name).toBe('Tyrannical');

    expect(item.suffixes).toHaveLength(1);
    expect(item.suffixes[0]?.category).toBe('RegularExplicit');
  });

  it('preserves itemLevel, corrupted, synthesised, influence', () => {
    const parsed = parse(`Item Class: Body Armours
Rarity: Rare
Test
Sacrificial Garb
--------
Item Level: 84
--------
Warlord Item
--------
Corrupted`);
    const item = translate(parsed, db);
    expect(item.itemLevel).toBe(84);
    expect(item.influence).toBe('warlord');
    expect(item.corrupted).toBe(true);
  });

  it('falls back to a "pure" base when the base is not in BASE_DB', () => {
    const parsed = parse(`Item Class: Misc
Rarity: Rare
Some Item
Unknown Base XYZ
--------
Item Level: 86`);
    const item = translate(parsed, db);
    expect(item.attributeBase).toBe('pure');
    expect(item.defenceTags).toEqual([]);
  });

  it('sets hostItemId on fractured mods to the produced item id', () => {
    const parsed = parse(`Item Class: Body Armours
Rarity: Rare
Test
Sacrificial Garb
--------
Item Level: 86
--------
{ Fractured Prefix Modifier "Plated" (Tier: 1) — Defences }
100% increased Armour (fractured)`);
    const item = translate(parsed, db);
    expect(item.prefixes).toHaveLength(1);
    expect(item.prefixes[0]?.category).toBe('Fractured');
    expect(item.prefixes[0]?.hostItemId).toBe(item.id);
  });
});
