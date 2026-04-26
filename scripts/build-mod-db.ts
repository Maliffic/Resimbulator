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

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${REPOE_BASE}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function transformMods(repoeData: Record<string, RePoEMod>): ModDef[] {
  const out: ModDef[] = [];
  for (const [id, m] of Object.entries(repoeData)) {
    if (
      m.generation_type !== 'prefix' &&
      m.generation_type !== 'suffix' &&
      !['shaper', 'elder', 'crusader', 'hunter', 'warlord', 'redeemer', 'crafted'].includes(m.generation_type)
    ) {
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
