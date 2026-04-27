// scripts/build-mod-db.ts
//
// Fetches RePoE mod data and emits static/mod-db.json.
// Run via: npm run update-mod-db
//
// Derives NNN restrictions from spawn_weights so the categorizer can correctly
// tag mods as NNN_Defence / NNN_Attribute / NNN_Influenced.

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { ModDef, GenerationType, ModDomain } from '../src/lib/mods/types.js';
import type { AttributeBase, DefenceTag, Influence } from '../src/lib/recombinator/index.js';

const REPOE_BASE = 'https://raw.githubusercontent.com/repoe-fork/repoe-fork.github.io/master/data';
const OUTPUT_PATH = resolve('static', 'mod-db.json');

type RePoEMod = {
  name: string;
  domain: string;
  generation_type: string;
  groups?: string[];
  type?: string;
  required_level?: number;
  is_essence_only?: boolean;
  spawn_weights?: Array<{ tag: string; weight: number }>;
  stats?: Array<{ id: string; min: number; max: number }>;
};

// Attribute-armour tags: each implies a fixed (defence-set, attribute-base) for any base with that tag.
const TAG_DEFENCES: Record<string, DefenceTag[]> = {
  str_armour: ['armour'],
  dex_armour: ['evasion'],
  int_armour: ['energy_shield'],
  str_dex_armour: ['armour', 'evasion'],
  str_int_armour: ['armour', 'energy_shield'],
  dex_int_armour: ['evasion', 'energy_shield'],
  // Tri-stat fallback tag — covers all defences, used as a low-weight catch-all on many mods.
  str_dex_int_armour: ['armour', 'evasion', 'energy_shield'],
};

const TAG_ATTRIBUTES: Record<string, AttributeBase[]> = {
  str_armour: ['str'],
  dex_armour: ['dex'],
  int_armour: ['int'],
  str_dex_armour: ['str_dex'],
  str_int_armour: ['str_int'],
  dex_int_armour: ['dex_int'],
  // str_dex_int_armour items are rare/exotic — don't constrain attribute restriction via this tag.
};

const INFLUENCE_GEN_TYPES: ReadonlySet<string> = new Set([
  'shaper', 'elder', 'crusader', 'hunter', 'warlord', 'redeemer',
]);

const ALL_DEFENCES: ReadonlySet<DefenceTag> = new Set(['armour', 'evasion', 'energy_shield']);
const ALL_ATTRIBUTES: ReadonlySet<AttributeBase> = new Set([
  'str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int',
]);

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${REPOE_BASE}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function positiveWeightTags(m: RePoEMod): Set<string> {
  const out = new Set<string>();
  for (const w of m.spawn_weights ?? []) {
    if (w.weight > 0 && w.tag !== 'default') out.add(w.tag);
  }
  return out;
}

function deriveDefenceRestriction(tags: Set<string>): DefenceTag[] | undefined {
  const armourTags = [...tags].filter((t) => t in TAG_DEFENCES);
  if (armourTags.length === 0) return undefined;

  // Defence restriction = intersection across all attribute-armour tags' defence sets.
  // (If a mod can roll on dex_armour AND str_dex_int_armour, it requires evasion — the common defence.)
  let acc: Set<DefenceTag> | undefined;
  for (const t of armourTags) {
    const ds = new Set(TAG_DEFENCES[t]!);
    if (acc === undefined) acc = ds;
    else acc = new Set([...acc].filter((d) => ds.has(d)));
  }
  if (!acc || acc.size === 0) return undefined;
  if (acc.size === ALL_DEFENCES.size) return undefined;
  return [...acc];
}

function deriveAttributeRestriction(tags: Set<string>): AttributeBase[] | undefined {
  const armourTags = [...tags].filter((t) => t in TAG_ATTRIBUTES);
  if (armourTags.length === 0) return undefined;

  // Attribute restriction = union of attribute bases across this mod's tags.
  const acc = new Set<AttributeBase>();
  for (const t of armourTags) for (const a of TAG_ATTRIBUTES[t]!) acc.add(a);
  if (acc.size === 0) return undefined;
  if (acc.size >= ALL_ATTRIBUTES.size) return undefined;
  return [...acc];
}

const INFLUENCE_TAG_RE = /_(shaper|elder|crusader|hunter|warlord|redeemer)$/;

function deriveInfluenceRestriction(genType: string, tags: Set<string>): Influence | undefined {
  if (INFLUENCE_GEN_TYPES.has(genType)) return genType as Influence;
  for (const t of tags) {
    const m = INFLUENCE_TAG_RE.exec(t);
    if (m) return m[1] as Influence;
  }
  return undefined;
}

function transformMods(repoeData: Record<string, RePoEMod>): ModDef[] {
  // Build tier ranks: within each (type, affix) sort by required_level desc and assign tier 1..N.
  type RankKey = string;
  const groups = new Map<RankKey, Array<{ id: string; req: number }>>();
  for (const [id, m] of Object.entries(repoeData)) {
    const affix = (m.generation_type === 'suffix' ? 'suffix' : 'prefix') as 'prefix' | 'suffix';
    if (!m.type) continue;
    const key = `${m.type}|${affix}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id, req: m.required_level ?? 0 });
  }
  const tierById = new Map<string, number>();
  for (const arr of groups.values()) {
    arr.sort((a, b) => b.req - a.req);
    arr.forEach((e, i) => tierById.set(e.id, i + 1));
  }

  const out: ModDef[] = [];
  for (const [id, m] of Object.entries(repoeData)) {
    const gen = m.generation_type;
    if (gen !== 'prefix' && gen !== 'suffix' && gen !== 'crafted' && !INFLUENCE_GEN_TYPES.has(gen)) {
      continue;
    }
    if (m.domain === 'flask' || m.domain === 'jewel' || m.domain === 'misc') continue;

    const affix: 'prefix' | 'suffix' = gen === 'suffix' ? 'suffix' : 'prefix';
    const tags = positiveWeightTags(m);

    // Skip mods that can't actually roll anywhere in the standard pool. Keep crafted/influenced
    // mods even with no spawn weights — they're added by other means.
    if (tags.size === 0 && gen === 'prefix' || gen === 'suffix') {
      // Still emit if there are no positive weights — they may be essence-only or master-craft.
      // We don't filter these out wholesale because the categorizer still needs to recognize them.
    }

    const entry: ModDef = {
      id,
      name: m.name || id,
      affix,
      tier: m.is_essence_only ? null : (tierById.get(id) ?? null),
      tags: [...tags],
      generationType: gen as GenerationType,
      domain: m.domain as ModDomain,
      statTemplates: (m.stats ?? []).map((s) => s.id),
    };

    const defRest = deriveDefenceRestriction(tags);
    if (defRest) entry.defenceRestriction = defRest;

    const attrRest = deriveAttributeRestriction(tags);
    if (attrRest) entry.attributeRestriction = attrRest;

    const infRest = deriveInfluenceRestriction(gen, tags);
    if (infRest) entry.influenceRestriction = infRest;

    out.push(entry);
  }
  return out;
}

async function main(): Promise<void> {
  console.log(`Fetching RePoE data from ${REPOE_BASE}...`);
  const repoeData = await fetchJson<Record<string, RePoEMod>>('mods.json');
  console.log(`Fetched ${Object.keys(repoeData).length} raw RePoE mod entries`);

  const transformed = transformMods(repoeData);
  console.log(`Transformed to ${transformed.length} app-shape ModDef entries`);

  const nDef = transformed.filter((m) => m.defenceRestriction).length;
  const nAttr = transformed.filter((m) => m.attributeRestriction).length;
  const nInf = transformed.filter((m) => m.influenceRestriction).length;
  console.log(`  with defenceRestriction: ${nDef}`);
  console.log(`  with attributeRestriction: ${nAttr}`);
  console.log(`  with influenceRestriction: ${nInf}`);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(transformed, null, 0));
  const sizeKb = Math.round(JSON.stringify(transformed).length / 1024);
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
