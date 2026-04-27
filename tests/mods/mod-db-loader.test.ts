// tests/mods/mod-db-loader.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadModDb, lookupByNameTierAffix } from '../../src/lib/mods/mod-db-loader.js';

const FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/mods/fixture-mod-db.json',
);

describe('loadModDb', () => {
  it('builds three lookup indexes from a list of ModDef entries', () => {
    const raw = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const db = loadModDb(raw);
    expect(db.byId.size).toBeGreaterThan(0);
    expect(db.byNameTierAffix.size).toBeGreaterThan(0);
  });
});

describe('lookupByNameTierAffix', () => {
  const raw = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const db = loadModDb(raw);

  it('finds a tiered prefix mod', () => {
    const m = lookupByNameTierAffix(db, 'Tyrannical', 1, 'prefix');
    expect(m?.id).toBe('TyrannicalDamage1');
  });

  it('finds an untiered (essence) mod by name+null+affix', () => {
    const m = lookupByNameTierAffix(db, 'Essence Plating', null, 'prefix');
    expect(m?.id).toBe('EssencePlatingArmour');
  });

  it('returns undefined when affix mismatches', () => {
    expect(lookupByNameTierAffix(db, 'Tyrannical', 1, 'suffix')).toBeUndefined();
  });

  it('falls back to a name+affix match when tier mismatches (clipboard tiers are per-item-class)', () => {
    const m = lookupByNameTierAffix(db, 'Tyrannical', 99, 'prefix');
    expect(m?.name).toBe('Tyrannical');
    expect(m?.affix).toBe('prefix');
  });
});
