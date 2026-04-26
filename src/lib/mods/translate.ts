// src/lib/mods/translate.ts
import { randomUUID } from 'node:crypto';
import type { ParsedItem, ParsedMod } from '../poe-clipboard/index.js';
import type { Item, Mod, AttributeBase, DefenceTag } from '../recombinator/index.js';
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
