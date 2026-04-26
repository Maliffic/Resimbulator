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
