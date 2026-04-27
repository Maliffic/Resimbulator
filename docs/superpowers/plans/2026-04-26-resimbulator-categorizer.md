# Resimbulator Mod Database + Categorizer Implementation Plan (Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bridge Plan 2's `ParsedItem` (clipboard output) and Plan 1's `Item` (engine input) by adding a mod categorizer and a base-item database. The categorizer maps each `ParsedMod` to a `ModCategory` and applies per-mod requirements (`requiresInfluence`, `requiresDefenceTag`, `allowedAttributeBases`, `hostItemId`) so the engine's eligibility filter behaves correctly. Output: a `translate(parsedItem, otherItemId?)` function that produces an engine-ready `Item`.

**Architecture:** Two data sources — a hand-curated **base-items** map (about 40-60 popular Settlers crafting bases, attribute base + defence tags) and a generated **mod-database** map (RePoE-derived, fetchable via `npm run update-mod-db`). Tests use small inline fixtures, NOT the full RePoE data, so they run without network access and stay fast. Production usage requires running the update script once. The categorizer applies rules in priority order: clipboard flags first (Crafted / Veiled / Fractured / Implicit are unambiguous), then mod-database lookup for everything else (NNN_Influenced, NNN_Defence, NNN_Attribute, untiered essence, breach, incursion, etc.).

**Tech Stack:** Same as Plans 1-2 — TypeScript 5.x, Node 20+, Vitest. New runtime dep: none. New dev dep: optional `node-fetch` for the build script (or use Node's built-in `fetch` since we're on Node 20+).

**Spec reference:** `docs/superpowers/specs/2026-04-26-resimbulator-design.md` section "Mod database & categorization".

**Out of scope for Plan 3:**
- UI integration (Plan 4)
- Full RePoE coverage of every league mod (we cover the categories the engine cares about — finer breakdowns can be added on demand)
- Mod weighting (deferred per Q3=B)

**Dependencies:** Plans 1 + 2 complete. The categorizer imports both engine types (`Item`, `Mod`, `ModCategory`) and parser types (`ParsedItem`, `ParsedMod`).

---

## File Structure

Created in this plan:
```
src/lib/mods/
  types.ts                   # ModDef, BaseDef, ModDb, BaseDb
  base-db.ts                 # hand-curated base-items map
  mod-db-loader.ts           # load mod-database JSON, build lookup indexes
  categorize.ts              # parsedMod + base context → ModCategory + requirements
  translate.ts               # ParsedItem (+ optional otherItemId) → engine Item
  index.ts                   # public API barrel

src/cli/
  main.ts                    # MODIFIED: add `translate` command (clipboard → engine Item)

scripts/
  build-mod-db.ts            # one-shot RePoE fetch + transform (npm run update-mod-db)

static/
  mod-db.json                # generated; committed for repeatable builds
                             # (or: .gitignored and fetched per-environment — decided in Task 9)

tests/mods/
  base-db.test.ts
  mod-db-loader.test.ts
  categorize.test.ts
  translate.test.ts

tests/fixtures/mods/
  fixture-mod-db.json        # tiny synthetic mod-database for tests
```

---

## Task 1: Mod-database types

**Files:**
- Create: `src/lib/mods/types.ts`

- [ ] **Step 1: Write `src/lib/mods/types.ts`**

```ts
// src/lib/mods/types.ts
import type { AttributeBase, DefenceTag, Influence } from '../recombinator/index.js';

/**
 * One entry in the mod database — derived from RePoE.
 */
export type ModDef = {
  /** RePoE mod id (e.g. 'TyrannicalDamage1') */
  id: string;
  /** Display name shown in clipboard hints (e.g. 'Tyrannical') */
  name: string;
  affix: 'prefix' | 'suffix';
  /** Null for untiered (essence) mods. */
  tier: number | null;
  /** Tags from RePoE (e.g. ['damage', 'attack', 'physical']) */
  tags: string[];
  /** RePoE generation_type. Drives Influenced and Crafted detection. */
  generationType: GenerationType;
  /** RePoE domain. Drives Breach / Incursion / Delve detection. */
  domain: ModDomain;
  /** Stat-text templates for matching parser stat lines (e.g. '#% increased Physical Damage'). */
  statTemplates: string[];
  /** Optional source markers — set when the mod is gated on attribute or defence tags. */
  attributeRestriction?: AttributeBase[];
  defenceRestriction?: DefenceTag[];
  influenceRestriction?: Influence;
};

export type GenerationType =
  | 'prefix' | 'suffix'
  | 'crafted'
  | 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer'
  | 'enchant' | 'corrupted'
  | 'unique';

export type ModDomain =
  | 'item' | 'crafted' | 'veiled'
  | 'breach' | 'incursion' | 'delve'
  | 'flask' | 'jewel' | 'misc';

/**
 * One entry in the base-items database — hand-curated for v1.
 */
export type BaseDef = {
  /** Display name (e.g. 'Sacrificial Garb') */
  name: string;
  itemClass: string;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
};

export type ModDb = {
  /** Lookup by mod name + tier + affix. Most common path when type hints are present. */
  byNameTierAffix: Map<string, ModDef>;
  /** Lookup by id. */
  byId: Map<string, ModDef>;
  /** Lookup by stat-text template (regex-stringified) for type-hints-off fallback. */
  byStatTemplate: Map<string, ModDef[]>;
};

export type BaseDb = Map<string, BaseDef>;
```

- [ ] **Step 2: Run typecheck**

```bash
cd /home/nick/projects/personal/Resimbulator
npm run typecheck
```

Exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mods/types.ts
git commit -m "feat(mods): ModDef, BaseDef, ModDb types"
```

---

## Task 2: Hand-curated base-items database

We start with a small curated map covering popular Settlers-era crafting bases. Plan 3b (future) can replace this with RePoE-derived data. About 40 entries gives us enough coverage for the common cases.

**Files:**
- Create: `src/lib/mods/base-db.ts`
- Create: `tests/mods/base-db.test.ts`

- [ ] **Step 1: Failing test**

```ts
// tests/mods/base-db.test.ts
import { describe, it, expect } from 'vitest';
import { BASE_DB, lookupBase } from '../../src/lib/mods/base-db.js';

describe('BASE_DB curation', () => {
  it('contains entries for common Settlers crafting bases', () => {
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
```

- [ ] **Step 2: Run** — FAIL (`Cannot find module`)

```bash
npm test -- tests/mods/base-db.test.ts
```

- [ ] **Step 3: Implement `src/lib/mods/base-db.ts`**

```ts
// src/lib/mods/base-db.ts
import type { BaseDef, BaseDb } from './types.js';

/**
 * Hand-curated base-items database covering ~40 popular crafting bases.
 * Plan 3b (future) will replace this with RePoE-derived data for full coverage.
 */
const ENTRIES: readonly BaseDef[] = [
  // Body Armours — STR
  { name: 'Astral Plate',       itemClass: 'Body Armours', attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Glorious Plate',     itemClass: 'Body Armours', attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Kaom\'s Plate',      itemClass: 'Body Armours', attributeBase: 'str',     defenceTags: ['armour'] },
  // Body Armours — STR/INT
  { name: 'Sacrificial Garb',   itemClass: 'Body Armours', attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'] },
  { name: 'Saint\'s Hauberk',   itemClass: 'Body Armours', attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'] },
  // Body Armours — INT
  { name: 'Vaal Regalia',       itemClass: 'Body Armours', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Sage\'s Robe',       itemClass: 'Body Armours', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  // Body Armours — DEX/INT
  { name: 'Carnal Armour',      itemClass: 'Body Armours', attributeBase: 'dex_int', defenceTags: ['evasion', 'energy_shield'] },
  { name: 'Hyrri\'s Ire',       itemClass: 'Body Armours', attributeBase: 'dex_int', defenceTags: ['evasion', 'energy_shield'] },
  // Body Armours — STR/DEX
  { name: 'Full Dragonscale',   itemClass: 'Body Armours', attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  // Gloves
  { name: 'Goliath Gauntlets',  itemClass: 'Gloves',       attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Sorcerer Gloves',    itemClass: 'Gloves',       attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Hydrascale Gauntlets', itemClass: 'Gloves',     attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  { name: 'Stealth Gloves',     itemClass: 'Gloves',       attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Spike-Point Arrow Quiver', itemClass: 'Quivers', attributeBase: 'pure', defenceTags: [] },
  // Boots
  { name: 'Two-Toned Boots',    itemClass: 'Boots',        attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  { name: 'Titan Greaves',      itemClass: 'Boots',        attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Sorcerer Boots',     itemClass: 'Boots',        attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Slink Boots',        itemClass: 'Boots',        attributeBase: 'dex',     defenceTags: ['evasion'] },
  // Helmets
  { name: 'Eternal Burgonet',   itemClass: 'Helmets',      attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Mind Cage',          itemClass: 'Helmets',      attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Hubris Circlet',     itemClass: 'Helmets',      attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Lion Pelt',          itemClass: 'Helmets',      attributeBase: 'dex',     defenceTags: ['evasion'] },
  // Wands (no defence tags)
  { name: 'Opal Wand',          itemClass: 'Wands',        attributeBase: 'int',     defenceTags: [] },
  { name: 'Imbued Wand',        itemClass: 'Wands',        attributeBase: 'int',     defenceTags: [] },
  { name: 'Convoking Wand',     itemClass: 'Wands',        attributeBase: 'int',     defenceTags: [] },
  // Rings (no defence tags)
  { name: 'Topaz Ring',         itemClass: 'Rings',        attributeBase: 'pure',    defenceTags: [] },
  { name: 'Sapphire Ring',      itemClass: 'Rings',        attributeBase: 'pure',    defenceTags: [] },
  { name: 'Ruby Ring',          itemClass: 'Rings',        attributeBase: 'pure',    defenceTags: [] },
  { name: 'Two-Stone Ring',     itemClass: 'Rings',        attributeBase: 'pure',    defenceTags: [] },
  { name: 'Iron Ring',          itemClass: 'Rings',        attributeBase: 'pure',    defenceTags: [] },
  // Amulets (no defence tags)
  { name: 'Marble Amulet',      itemClass: 'Amulets',      attributeBase: 'pure',    defenceTags: [] },
  { name: 'Lapis Amulet',       itemClass: 'Amulets',      attributeBase: 'pure',    defenceTags: [] },
  { name: 'Onyx Amulet',        itemClass: 'Amulets',      attributeBase: 'pure',    defenceTags: [] },
  // Belts
  { name: 'Stygian Vise',       itemClass: 'Belts',        attributeBase: 'pure',    defenceTags: [] },
  { name: 'Heavy Belt',         itemClass: 'Belts',        attributeBase: 'pure',    defenceTags: [] },
  // Quivers
  { name: 'Spike-Point Arrow Quiver', itemClass: 'Quivers', attributeBase: 'pure', defenceTags: [] },
  // Daggers
  { name: 'Royal Skean',        itemClass: 'Daggers',      attributeBase: 'dex_int', defenceTags: [] },
  // Sceptres
  { name: 'Carnal Sceptre',     itemClass: 'Sceptres',     attributeBase: 'str_int', defenceTags: [] },
];

export const BASE_DB: BaseDb = new Map(ENTRIES.map((e) => [e.name, e]));

export function lookupBase(name: string): BaseDef | undefined {
  return BASE_DB.get(name);
}
```

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- tests/mods/base-db.test.ts
npm run typecheck
```

All pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mods/base-db.ts tests/mods/base-db.test.ts
git commit -m "feat(mods): hand-curated base-items database (~40 entries)"
```

---

## Task 3: Mod-DB loader (with synthetic test fixture)

The mod database is JSON-shaped, loaded from `static/mod-db.json` at runtime. For tests, we use a small inline fixture so they don't depend on the production JSON existing.

**Files:**
- Create: `tests/fixtures/mods/fixture-mod-db.json`
- Create: `src/lib/mods/mod-db-loader.ts`
- Create: `tests/mods/mod-db-loader.test.ts`

- [ ] **Step 1: Create the test fixture**

`tests/fixtures/mods/fixture-mod-db.json`:

```json
[
  {
    "id": "TyrannicalDamage1",
    "name": "Tyrannical",
    "affix": "prefix",
    "tier": 1,
    "tags": ["damage", "attack", "physical"],
    "generationType": "prefix",
    "domain": "item",
    "statTemplates": ["#% increased Physical Damage"]
  },
  {
    "id": "InsulationCold5",
    "name": "of Insulation",
    "affix": "suffix",
    "tier": 5,
    "tags": ["elemental", "resistance"],
    "generationType": "suffix",
    "domain": "item",
    "statTemplates": ["+#% to Cold Resistance"]
  },
  {
    "id": "WarlordCritMulti1",
    "name": "Empowering",
    "affix": "prefix",
    "tier": 1,
    "tags": ["influence"],
    "generationType": "warlord",
    "domain": "item",
    "statTemplates": ["+#% to Critical Strike Multiplier"],
    "influenceRestriction": "warlord"
  },
  {
    "id": "BreachArmourFire1",
    "name": "Breach",
    "affix": "prefix",
    "tier": 1,
    "tags": ["breach"],
    "generationType": "prefix",
    "domain": "breach",
    "statTemplates": ["+# armour overcapped fire"]
  },
  {
    "id": "ArmourLocal1",
    "name": "Plated",
    "affix": "prefix",
    "tier": 1,
    "tags": ["defences"],
    "generationType": "prefix",
    "domain": "item",
    "statTemplates": ["#% increased Armour"],
    "defenceRestriction": ["armour"]
  },
  {
    "id": "StrLifeRegen1",
    "name": "Hale",
    "affix": "prefix",
    "tier": 1,
    "tags": ["life"],
    "generationType": "prefix",
    "domain": "item",
    "statTemplates": ["#% of Life Regenerated per second"],
    "attributeRestriction": ["str", "str_int", "str_dex"]
  },
  {
    "id": "EssencePlatingArmour",
    "name": "Essence Plating",
    "affix": "prefix",
    "tier": null,
    "tags": ["defences"],
    "generationType": "prefix",
    "domain": "item",
    "statTemplates": ["Adds # to # Armour"]
  },
  {
    "id": "AspectOfSpider1",
    "name": "Aspect of the Spider",
    "affix": "suffix",
    "tier": 1,
    "tags": ["aspect"],
    "generationType": "suffix",
    "domain": "item",
    "statTemplates": ["Grants Level # Aspect of the Spider Skill"]
  }
]
```

- [ ] **Step 2: Failing test**

```ts
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

  it('returns undefined when tier mismatches', () => {
    expect(lookupByNameTierAffix(db, 'Tyrannical', 99, 'prefix')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run** — FAIL

```bash
npm test -- tests/mods/mod-db-loader.test.ts
```

- [ ] **Step 4: Implement `src/lib/mods/mod-db-loader.ts`**

```ts
// src/lib/mods/mod-db-loader.ts
import type { ModDb, ModDef } from './types.js';

export function loadModDb(entries: ModDef[]): ModDb {
  const byId = new Map<string, ModDef>();
  const byNameTierAffix = new Map<string, ModDef>();
  const byStatTemplate = new Map<string, ModDef[]>();

  for (const m of entries) {
    byId.set(m.id, m);
    byNameTierAffix.set(keyNameTierAffix(m.name, m.tier, m.affix), m);
    for (const tpl of m.statTemplates) {
      const key = normalizeTemplate(tpl);
      const existing = byStatTemplate.get(key);
      if (existing) existing.push(m);
      else byStatTemplate.set(key, [m]);
    }
  }
  return { byId, byNameTierAffix, byStatTemplate };
}

function keyNameTierAffix(name: string, tier: number | null, affix: 'prefix' | 'suffix'): string {
  return `${affix} ${name} ${tier ?? 'null'}`;
}

function normalizeTemplate(tpl: string): string {
  // Templates like '#% increased Physical Damage' are already normalized.
  // We collapse whitespace and lowercase to be tolerant.
  return tpl.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function lookupByNameTierAffix(
  db: ModDb,
  name: string,
  tier: number | null,
  affix: 'prefix' | 'suffix',
): ModDef | undefined {
  return db.byNameTierAffix.get(keyNameTierAffix(name, tier, affix));
}

export function lookupByStatLine(db: ModDb, statLine: string): ModDef[] {
  // Convert a concrete stat line to a template by replacing numbers with '#'.
  const template = normalizeTemplate(statLine.replace(/[+\-]?\d+(?:\.\d+)?/g, '#'));
  return db.byStatTemplate.get(template) ?? [];
}
```

- [ ] **Step 5: Run + typecheck**

```bash
npm test -- tests/mods/mod-db-loader.test.ts
npm run typecheck
```

Both pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mods/mod-db-loader.ts tests/mods/mod-db-loader.test.ts tests/fixtures/mods/fixture-mod-db.json
git commit -m "feat(mods): mod-DB loader with by-name+tier+affix and stat-template indexes"
```

---

## Task 4: Categorizer

Maps a `ParsedMod` (with optional mod-database entry) to a `ModCategory` plus the per-mod requirements (`requiresInfluence`, `requiresDefenceTag`, `allowedAttributeBases`, `hostItemId`).

Categorizer rules in priority order:
1. `parsedMod.affix === 'implicit'` → `Implicit`
2. `parsedMod.hint.flags.includes('fractured')` → `Fractured` (set `hostItemId` from caller context)
3. `parsedMod.hint.flags.includes('crafted')` → `ExclusiveCrafted`
4. `parsedMod.hint.flags.includes('veiled')` → `ExclusiveVeiled`
5. Mod-DB lookup says `domain: 'breach'` → `ExclusiveBreach`
6. Mod-DB lookup says `domain: 'incursion'` → `ExclusiveIncursion`
7. Mod-DB lookup says `domain: 'delve'` → `ExclusiveDelve`
8. Mod name matches `/^Aspect of/` → `ExclusiveBeastAspect`
9. Mod-DB lookup has `tier: null` AND name suggests essence → `ExclusiveEssence`
10. Mod-DB lookup has `generationType ∈ {shaper,elder,...}` → `NNN_Influenced` (with `requiresInfluence`)
11. Mod-DB lookup has `defenceRestriction` → `NNN_Defence` (with `requiresDefenceTag`)
12. Mod-DB lookup has `attributeRestriction` → `NNN_Attribute` (with `allowedAttributeBases`)
13. Default → `RegularExplicit`

**Files:**
- Create: `src/lib/mods/categorize.ts`
- Create: `tests/mods/categorize.test.ts`

- [ ] **Step 1: Failing test**

```ts
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
```

- [ ] **Step 2: Run** — FAIL

```bash
npm test -- tests/mods/categorize.test.ts
```

- [ ] **Step 3: Implement `src/lib/mods/categorize.ts`**

```ts
// src/lib/mods/categorize.ts
import type { ParsedMod } from '../poe-clipboard/index.js';
import type {
  ModCategory, AttributeBase, DefenceTag, Influence,
} from '../recombinator/index.js';
import type { ModDb, ModDef } from './types.js';
import { lookupByNameTierAffix } from './mod-db-loader.js';

export type CategorizeResult = {
  category: ModCategory;
  hostItemId?: string;
  requiresInfluence?: Influence;
  requiresDefenceTag?: DefenceTag;
  allowedAttributeBases?: AttributeBase[];
};

const INFLUENCE_TYPES: ReadonlySet<string> = new Set([
  'shaper', 'elder', 'crusader', 'hunter', 'warlord', 'redeemer',
]);

export function categorize(parsed: ParsedMod, db: ModDb, hostItemId: string): CategorizeResult {
  // Rule 1: Implicit
  if (parsed.affix === 'implicit') return { category: 'Implicit' };

  const flags = parsed.hint?.flags ?? [];

  // Rule 2: Fractured
  if (flags.includes('fractured')) return { category: 'Fractured', hostItemId };

  // Rule 3: Crafted
  if (flags.includes('crafted')) return { category: 'ExclusiveCrafted' };

  // Rule 4: Veiled
  if (flags.includes('veiled')) return { category: 'ExclusiveVeiled' };

  // Mod-DB lookup
  const def = lookupModDef(parsed, db);

  // Rule 5/6/7: Breach/Incursion/Delve via domain
  if (def) {
    if (def.domain === 'breach') return { category: 'ExclusiveBreach' };
    if (def.domain === 'incursion') return { category: 'ExclusiveIncursion' };
    if (def.domain === 'delve') return { category: 'ExclusiveDelve' };
  }

  // Rule 8: Beast aspect by name pattern
  if (parsed.hint?.name && /^Aspect of/i.test(parsed.hint.name)) {
    return { category: 'ExclusiveBeastAspect' };
  }

  // Rule 9: Untiered essence
  if (def && def.tier === null) {
    return { category: 'ExclusiveEssence' };
  }

  // Rule 10: Influenced by generationType
  if (def && INFLUENCE_TYPES.has(def.generationType)) {
    const out: CategorizeResult = { category: 'NNN_Influenced' };
    if (def.influenceRestriction) out.requiresInfluence = def.influenceRestriction;
    else out.requiresInfluence = def.generationType as Influence;
    return out;
  }

  // Rule 11: NNN_Defence
  if (def?.defenceRestriction && def.defenceRestriction.length > 0) {
    return {
      category: 'NNN_Defence',
      requiresDefenceTag: def.defenceRestriction[0]!,
    };
  }

  // Rule 12: NNN_Attribute
  if (def?.attributeRestriction && def.attributeRestriction.length > 0) {
    return {
      category: 'NNN_Attribute',
      allowedAttributeBases: [...def.attributeRestriction],
    };
  }

  // Rule 13: Default
  return { category: 'RegularExplicit' };
}

function lookupModDef(parsed: ParsedMod, db: ModDb): ModDef | undefined {
  if (parsed.hint && (parsed.affix === 'prefix' || parsed.affix === 'suffix')) {
    return lookupByNameTierAffix(db, parsed.hint.name, parsed.hint.tier, parsed.affix);
  }
  return undefined;
}
```

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- tests/mods/categorize.test.ts
npm run typecheck
```

Both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mods/categorize.ts tests/mods/categorize.test.ts
git commit -m "feat(mods): categorizer mapping ParsedMod to ModCategory + requirements"
```

---

## Task 5: Translator (ParsedItem → engine Item)

Wires categorize + base-DB lookup to produce engine-ready `Item`. Uses `crypto.randomUUID()` for item ids.

**Files:**
- Create: `src/lib/mods/translate.ts`
- Create: `tests/mods/translate.test.ts`

- [ ] **Step 1: Failing test**

```ts
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

    // Two prefixes (Tyrannical, Brisk's) — both regular
    expect(item.prefixes).toHaveLength(2);
    expect(item.prefixes[0]?.category).toBe('RegularExplicit');
    expect(item.prefixes[0]?.name).toBe('Tyrannical');

    // One suffix (of Insulation) — regular
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
```

- [ ] **Step 2: Run** — FAIL

```bash
npm test -- tests/mods/translate.test.ts
```

- [ ] **Step 3: Implement `src/lib/mods/translate.ts`**

```ts
// src/lib/mods/translate.ts
import { randomUUID } from 'node:crypto';
import type { ParsedItem, ParsedMod } from '../poe-clipboard/index.js';
import type { Item, Mod, AttributeBase, DefenceTag, Influence } from '../recombinator/index.js';
import type { ModDb } from './types.js';
import { lookupBase } from './base-db.js';
import { categorize } from './categorize.js';

export function translate(parsed: ParsedItem, db: ModDb): Item {
  const id = randomUUID();
  const baseDef = lookupBase(parsed.base);
  const attributeBase: AttributeBase = baseDef?.attributeBase ?? 'pure';
  const defenceTags: DefenceTag[] = baseDef?.defenceTags ?? [];

  const item: Item = {
    id,
    base: parsed.base,
    itemClass: parsed.itemClass,
    itemLevel: parsed.itemLevel,
    attributeBase,
    defenceTags,
    influence: parsed.influence,
    corrupted: parsed.corrupted,
    synthesised: parsed.synthesised,
    implicits: parsed.implicits.map((p) => translateMod(p, db, id)),
    prefixes: parsed.prefixes.map((p) => translateMod(p, db, id)),
    suffixes: parsed.suffixes.map((p) => translateMod(p, db, id)),
  };
  return item;
}

function translateMod(parsed: ParsedMod, db: ModDb, hostItemId: string): Mod {
  const cat = categorize(parsed, db, hostItemId);
  const affix = parsed.affix === 'unknown' ? 'prefix' : parsed.affix;
  const id = parsed.hint?.name
    ? `${parsed.hint.name}_${parsed.hint.tier ?? 'untiered'}_${affix}`
    : randomUUID();

  const mod: Mod = {
    id,
    affix: affix as Mod['affix'],
    category: cat.category,
    name: parsed.hint?.name ?? '',
    tier: parsed.hint?.tier ?? null,
    statText: parsed.statLines.join(' / '),
  };
  if (cat.hostItemId !== undefined) mod.hostItemId = cat.hostItemId;
  if (cat.requiresInfluence !== undefined) mod.requiresInfluence = cat.requiresInfluence;
  if (cat.requiresDefenceTag !== undefined) mod.requiresDefenceTag = cat.requiresDefenceTag;
  if (cat.allowedAttributeBases !== undefined) mod.allowedAttributeBases = cat.allowedAttributeBases;
  return mod;
}
```

NOTE: `parsed.affix === 'unknown'` mods are coerced to `'prefix'` here as a temporary best-effort. A future refinement (Plan 3b) could improve this via mod-DB stat-text lookup. For test purposes, the existing fixtures don't include `unknown`-affix mods after categorization (only the no-type-hints fixture does, and that's a separate UX path).

- [ ] **Step 4: Run + typecheck**

```bash
npm test -- tests/mods/translate.test.ts
npm run typecheck
```

Both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mods/translate.ts tests/mods/translate.test.ts
git commit -m "feat(mods): translate ParsedItem to engine Item"
```

---

## Task 6: Public API + CLI command

**Files:**
- Create: `src/lib/mods/index.ts`
- Modify: `src/cli/main.ts`
- Modify: `tests/cli/main.test.ts`

- [ ] **Step 1: Create `src/lib/mods/index.ts`**

```ts
// src/lib/mods/index.ts
export type { ModDef, BaseDef, ModDb, BaseDb, GenerationType, ModDomain } from './types.js';
export { BASE_DB, lookupBase } from './base-db.js';
export { loadModDb, lookupByNameTierAffix, lookupByStatLine } from './mod-db-loader.js';
export { categorize } from './categorize.js';
export type { CategorizeResult } from './categorize.js';
export { translate } from './translate.js';
```

- [ ] **Step 2: Add a failing CLI test**

Append to `tests/cli/main.test.ts`:

```ts

describe('CLI translate command', () => {
  it('translates clipboard text into an engine Item', async () => {
    const clipboard = readFileSync(resolve(FIXTURES_DIR, 'rare-with-hints.txt'), 'utf8');
    const fixtureDb = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/mods/fixture-mod-db.json'),
      'utf8',
    );
    const input = JSON.stringify({ command: 'translate', clipboard, modDb: JSON.parse(fixtureDb) });
    const out = await runCli(input);
    expect(out.command).toBe('translate');
    if (out.command !== 'translate') throw new Error('typeguard');
    expect(out.item.attributeBase).toBe('str_int');
    expect(out.item.prefixes).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run** — FAIL (`out.command === 'translate'` not in the union yet)

```bash
npm test -- tests/cli/main.test.ts
```

- [ ] **Step 4: Modify `src/cli/main.ts`**

Add imports near the top:

```ts
import { loadModDb, translate } from '../lib/mods/index.js';
import type { ModDef } from '../lib/mods/index.js';
import type { Item as EngineItem } from '../lib/recombinator/index.js';
import { parse as parseClipboard } from '../lib/poe-clipboard/index.js';
```

(Note: `parseClipboard` may already be imported from a previous task — keep the existing import if so, don't duplicate.)

Replace the `CliInput` and `CliOutput` union with:

```ts
export type CliInput =
  | { command: 'probability' | 'simulate'; seed?: number; trials?: number; item1: Item; item2: Item }
  | { command: 'parse'; clipboard: string }
  | { command: 'translate'; clipboard: string; modDb: ModDef[] };

export type CliOutput =
  | { command: 'probability'; exact: number; monteCarlo: number }
  | { command: 'simulate'; results: Array<{ baseFromItem: 1 | 2; prefixes: string[]; suffixes: string[] }> }
  | { command: 'parse'; parsed: ParsedItem }
  | { command: 'translate'; item: EngineItem };
```

Inside `runCli`, add a translate branch. The placement is right after the existing `parse` branch:

```ts
  if (input.command === 'parse') {
    return { command: 'parse', parsed: parseClipboard(input.clipboard) };
  }

  if (input.command === 'translate') {
    const parsed = parseClipboard(input.clipboard);
    const db = loadModDb(input.modDb);
    return { command: 'translate', item: translate(parsed, db) };
  }
```

- [ ] **Step 5: Run + typecheck**

```bash
npm test -- tests/cli/main.test.ts
npm run typecheck
```

Both pass.

- [ ] **Step 6: Smoke test**

```bash
DB=$(cat tests/fixtures/mods/fixture-mod-db.json)
CLIP=$(cat tests/fixtures/clipboard/rare-with-hints.txt)
python3 -c "import json,os; print(json.dumps({'command':'translate','clipboard':os.environ['CLIP'],'modDb':json.loads(os.environ['DB'])}))" \
  CLIP="$CLIP" DB="$DB" 2>/dev/null | npm run engine
```

Note: shell variable expansion can mangle the clipboard text. If the smoke test gets noisy, just rely on the unit test for confirmation.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mods/index.ts src/cli/main.ts tests/cli/main.test.ts
git commit -m "feat(cli+mods): translate command for clipboard → engine Item"
```

---

## Task 7: RePoE build script (skeleton + manual run gate)

A minimal build script that fetches RePoE JSON files and emits `static/mod-db.json`. The script is shipped but NOT run on `npm install` — the user runs it on demand via `npm run update-mod-db`. Failures are non-blocking for CI.

**Files:**
- Create: `scripts/build-mod-db.ts`
- Modify: `package.json` (add `update-mod-db` script)
- Modify: `.gitignore` (add `static/mod-db.json` since it's regenerated)

- [ ] **Step 1: Create `scripts/build-mod-db.ts`**

```ts
// scripts/build-mod-db.ts
//
// Fetches RePoE mod data and emits static/mod-db.json.
// Run via: npm run update-mod-db
//
// This script is intentionally minimal — it produces a slim subset of RePoE's data
// that the categorizer needs. Edge cases (every league mod, every essence variant) can
// be added incrementally as we encounter them.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { ModDef } from '../src/lib/mods/types.js';

const REPOE_BASE = 'https://raw.githubusercontent.com/lvlvllvlvllvlvl/RePoE/master/RePoE/data';
const OUTPUT_PATH = resolve('static', 'mod-db.json');

type RePoEMod = {
  name: string;
  domain: string;
  generation_type: string;
  group?: string;
  required_level?: number;
  type?: string;
  spawn_weights?: Array<{ tag: string; weight: number }>;
  stats?: Array<{ id: string; min: number; max: number }>;
};

type RePoEModEntry = [string, RePoEMod];

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${REPOE_BASE}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function transformMods(repoeData: Record<string, RePoEMod>): ModDef[] {
  const out: ModDef[] = [];
  const entries = Object.entries(repoeData) as RePoEModEntry[];
  for (const [id, m] of entries) {
    if (m.generation_type !== 'prefix' && m.generation_type !== 'suffix' &&
        !['shaper', 'elder', 'crusader', 'hunter', 'warlord', 'redeemer', 'crafted'].includes(m.generation_type)) {
      continue;
    }
    if (m.domain === 'flask' || m.domain === 'jewel' || m.domain === 'misc') continue;

    const affix: 'prefix' | 'suffix' =
      m.generation_type === 'suffix' ? 'suffix' : 'prefix';

    const entry: ModDef = {
      id,
      name: m.name || id,
      affix,
      tier: typeof m.required_level === 'number' ? m.required_level : null,
      tags: (m.spawn_weights ?? []).map((w) => w.tag).filter((t) => t.length > 0),
      generationType: m.generation_type as ModDef['generationType'],
      domain: m.domain as ModDef['domain'],
      statTemplates: (m.stats ?? []).map((s) => s.id),
    };
    out.push(entry);
  }
  return out;
}

async function main() {
  console.log(`Fetching RePoE data from ${REPOE_BASE}...`);
  const repoeData = await fetchJson<Record<string, RePoEMod>>('mods.min.json');
  console.log(`Fetched ${Object.keys(repoeData).length} raw RePoE mod entries`);

  const transformed = transformMods(repoeData);
  console.log(`Transformed to ${transformed.length} app-shape ModDef entries`);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(transformed, null, 0));
  const sizeKb = Math.round(JSON.stringify(transformed).length / 1024);
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Modify `package.json` scripts to add `update-mod-db`**

Find the `scripts` block in `package.json` and add this line (preserve existing entries):

```json
"update-mod-db": "tsx scripts/build-mod-db.ts"
```

So the scripts block looks like:

```json
"scripts": {
  "lint": "eslint src tests --ext .ts --no-error-on-unmatched-pattern",
  "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "build": "tsc",
  "engine": "tsx src/cli/main.ts",
  "update-mod-db": "tsx scripts/build-mod-db.ts"
}
```

- [ ] **Step 3: Modify `.gitignore`**

Add the line `static/mod-db.json` so the generated file isn't tracked:

```
node_modules
dist
coverage
.DS_Store
*.log
static/mod-db.json
```

- [ ] **Step 4: Verify the script typechecks (don't run it — it requires network)**

```bash
cd /home/nick/projects/personal/Resimbulator
npm run typecheck
```

Exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-mod-db.ts package.json .gitignore
git commit -m "feat(mods): npm run update-mod-db build script (RePoE → static/mod-db.json)"
```

The script can be run later via `npm run update-mod-db` to populate the production mod database. Tests don't depend on it.

---

## Task 8: README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Find the "What's here so far" section and add a new "Mods (Plan 3)" subsection after the parser section:

```markdown
**Mods + categorizer (Plan 3):**
- Hand-curated base-items database (~40 popular Settlers crafting bases)
- RePoE-derived mod database build script (`npm run update-mod-db`)
- Categorizer that maps each `ParsedMod` to the correct `ModCategory` and applies per-mod requirements (`requiresInfluence`, `requiresDefenceTag`, `allowedAttributeBases`, `hostItemId`)
- Translator: `ParsedItem` → engine `Item`, ready for the simulator
```

Update the "What's coming (planned)" section to drop Plan 3 and keep only Plan 4:

```markdown
- **Plan 4:** SvelteKit UI, persistence, share-URL, deploy
```

Update the CLI section to mention the new `translate` command:

```markdown
**Translate clipboard → engine Item:**
```bash
DB=$(cat static/mod-db.json)   # generated via `npm run update-mod-db`, or use the test fixture
CLIP=$(cat my-item.txt)
python3 -c "import json,os; print(json.dumps({'command':'translate','clipboard':os.environ['CLIP'],'modDb':json.loads(os.environ['DB'])}))" \
  CLIP="$CLIP" DB="$DB" | npm run engine
```
```

Update the test count in the Validation section to reflect the new tests.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README update for Plan 3 (mods + categorizer)"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full suite**

```bash
cd /home/nick/projects/personal/Resimbulator
npm test
npm run typecheck
npm run lint
```

All green. Total tests should be roughly 107 (Plan 2) + ~15-20 new (Plan 3) = ~125.

- [ ] **Step 2: Confirm git log**

```bash
git log --oneline | head -15
```

Should show ~8 new commits from Plan 3.

- [ ] **Step 3: End-to-end smoke test (parse → translate → simulate)**

```bash
DB=$(cat tests/fixtures/mods/fixture-mod-db.json)
CLIP=$(cat tests/fixtures/clipboard/rare-with-hints.txt)
python3 -c "import json,os; print(json.dumps({'command':'translate','clipboard':os.environ['CLIP'],'modDb':json.loads(os.environ['DB'])}))" \
  CLIP="$CLIP" DB="$DB" | npm run engine
```

Confirm: output is a JSON `Item` with `attributeBase: "str_int"`, two prefixes (Tyrannical, Brisk's) categorized as `RegularExplicit`, one suffix (of Insulation) also `RegularExplicit`, and `defenceTags: ["armour", "energy_shield"]`.

---

## Plan-3 acceptance criteria

When this plan is complete, the repo:

1. Has a hand-curated `BASE_DB` covering popular crafting bases (~40 entries)
2. Has a `loadModDb` function that builds three lookup indexes from a `ModDef[]`
3. Has a `categorize` function that maps `ParsedMod` to `ModCategory` + requirements, applying rules in priority order
4. Has a `translate` function that produces an engine-ready `Item` from a `ParsedItem`
5. Has a CLI `translate` command exercising the full chain
6. Has a `npm run update-mod-db` script that fetches RePoE on demand
7. All tests + typecheck + lint green

## What's next after Plan 3

**Plan 4 (UI + persistence + deploy):**
- SvelteKit static SPA
- Three-region layout (item1 / stats / item2)
- localStorage state with versioned schema
- Share-URL via deflated base64
- Vercel deploy
- E2E tests via Playwright

After Plan 4, the project is shippable.
