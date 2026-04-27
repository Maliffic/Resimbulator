// src/lib/ui/generate.ts
// Random item-pair generator — lets visitors sample the simulator without needing
// to grab items from PoE. Picks two bases of the same itemClass, then samples
// real mods (eligible for each base) from the loaded mod database.

import type {
  AttributeBase, DefenceTag, Influence, Item, Mod, ModCategory,
} from '$lib/recombinator/index.js';
import type { BaseDef, ModDb, ModDef } from '$lib/mods/index.js';
import { BASE_DB } from '$lib/mods/index.js';

const INFLUENCES: readonly Influence[] = [
  'shaper', 'elder', 'crusader', 'hunter', 'warlord', 'redeemer',
];

const INFLUENCEABLE_CLASSES: ReadonlySet<string> = new Set([
  'Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields',
  'Quivers', 'Belts', 'Rings', 'Amulets',
]);

function rngPick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('rngPick: empty array');
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rngBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Allowlist of mod-DB `domain` values that can plausibly land on a gear item via recombination.
const GEAR_DOMAINS: ReadonlySet<string> = new Set([
  'item',      // regular explicit (incl. NNN-restricted variants)
  'crafted',   // bench/metacrafted
  'delve',     // drop-only Delve mods
  'breach',    // grasping mail
  'incursion', // temple
]);

function categorizeDef(def: ModDef): {
  category: ModCategory;
  requiresInfluence?: Influence;
  requiresDefenceTag?: DefenceTag;
  allowedAttributeBases?: AttributeBase[];
} {
  if (def.domain === 'crafted') return { category: 'ExclusiveCrafted' };
  if (def.domain === 'breach') return { category: 'ExclusiveBreach' };
  if (def.domain === 'incursion') return { category: 'ExclusiveIncursion' };
  if (def.domain === 'delve') return { category: 'ExclusiveDelve' };
  if (def.tier === null && def.domain === 'item') return { category: 'ExclusiveEssence' };
  if (def.influenceRestriction) {
    return { category: 'NNN_Influenced', requiresInfluence: def.influenceRestriction };
  }
  if (def.defenceRestriction && def.defenceRestriction.length > 0) {
    return { category: 'NNN_Defence', requiresDefenceTag: def.defenceRestriction[0]! };
  }
  if (def.attributeRestriction && def.attributeRestriction.length > 0) {
    return { category: 'NNN_Attribute', allowedAttributeBases: [...def.attributeRestriction] };
  }
  return { category: 'RegularExplicit' };
}

function isEligibleForBase(def: ModDef, base: BaseDef, influence: Influence | undefined): boolean {
  if (!GEAR_DOMAINS.has(def.domain)) return false;

  // Influence: an influenced mod can only roll on a base with that influence.
  if (def.influenceRestriction) return influence === def.influenceRestriction;

  // Defence: every required tag must be present on the base.
  if (def.defenceRestriction && def.defenceRestriction.length > 0) {
    return def.defenceRestriction.every((d) => base.defenceTags.includes(d));
  }
  // Attribute: base's attribute must be in the allowed list.
  if (def.attributeRestriction && def.attributeRestriction.length > 0) {
    return def.attributeRestriction.includes(base.attributeBase);
  }
  return true;
}

function titleCase(s: string): string {
  return s.split(' ').map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ');
}

function humanizeStatId(id: string, n: number): string {
  // RePoE statTemplates are stat IDs (e.g. `additional_strength`, `local_physical_damage_+%`).
  // We don't have full RePoE stat-translations here, so synthesize plausible labels from the id.
  // This is a sampler — exact wording isn't required, but it should look like PoE.
  if (id.includes('+%')) {
    const noun = id.replace(/_\+%$/, '').replace(/^local_/, '').replace(/_/g, ' ');
    return `${n}% increased ${titleCase(noun)}`;
  }
  if (id.includes('-%')) {
    const noun = id.replace(/_-%$/, '').replace(/^local_/, '').replace(/_/g, ' ');
    return `${n}% reduced ${titleCase(noun)}`;
  }
  if (id.startsWith('additional_')) return `+${n} to ${titleCase(id.slice(11).replace(/_/g, ' '))}`;
  if (id.startsWith('base_')) return `+${n} ${titleCase(id.slice(5).replace(/_/g, ' '))}`;
  if (id.startsWith('local_')) return `+${n} ${titleCase(id.slice(6).replace(/_/g, ' '))}`;
  return `+${n} ${titleCase(id.replace(/_/g, ' '))}`;
}

function statTextForDef(def: ModDef): string {
  // Templates may have `#` placeholders (post-translated) or raw stat IDs (pre-translated).
  const tpl = def.statTemplates[0];
  if (!tpl) return def.name;
  if (tpl.includes('#')) return tpl.replace(/#/g, () => String(rngBetween(8, 180)));
  return humanizeStatId(tpl, rngBetween(8, 180));
}

function defToMod(def: ModDef): Mod {
  const cat = categorizeDef(def);
  const mod: Mod = {
    id: `gen_${def.id}_${Math.random().toString(36).slice(2, 8)}`,
    affix: def.affix,
    category: cat.category,
    name: def.name,
    tier: def.tier,
    statText: statTextForDef(def),
  };
  if (cat.requiresInfluence) mod.requiresInfluence = cat.requiresInfluence;
  if (cat.requiresDefenceTag) mod.requiresDefenceTag = cat.requiresDefenceTag;
  if (cat.allowedAttributeBases) mod.allowedAttributeBases = cat.allowedAttributeBases;
  return mod;
}

function pickAffixMods(pool: ModDef[], affix: 'prefix' | 'suffix', count: number): Mod[] {
  const sameAffix = pool.filter((d) => d.affix === affix);
  if (sameAffix.length === 0) return [];

  const regulars = sameAffix.filter(
    (d) => d.domain === 'item' && d.tier !== null
      && !d.defenceRestriction && !d.attributeRestriction && !d.influenceRestriction,
  );
  const nnn = sameAffix.filter(
    (d) => d.domain === 'item'
      && (d.defenceRestriction || d.attributeRestriction || d.influenceRestriction),
  );
  const exclusives = sameAffix.filter(
    (d) => d.domain === 'crafted' || d.domain === 'delve' || d.domain === 'breach' || d.domain === 'incursion'
      || (d.tier === null && d.domain === 'item'),
  );

  // Pick a category weighted to keep regulars dominant; exclusives kept rare so the result
  // doesn't look like every mod is crafted.
  const choosePool = (): ModDef[] => {
    const r = Math.random();
    if (r < 0.06 && exclusives.length > 0) return exclusives;
    if (r < 0.30 && nnn.length > 0) return nnn;
    return regulars.length > 0 ? regulars : sameAffix;
  };

  const usedNames = new Set<string>();
  const picks: Mod[] = [];
  let safety = 0;
  while (picks.length < count && safety < 200) {
    safety++;
    const def = rngPick(choosePool());
    if (usedNames.has(def.name)) continue;
    usedNames.add(def.name);
    picks.push(defToMod(def));
  }
  return picks;
}

function generateOneItem(
  modDb: ModDb,
  base: BaseDef,
  influence: Influence | undefined,
): Item {
  const id = globalThis.crypto.randomUUID();
  const eligible = Array.from(modDb.byId.values()).filter(
    (def) => isEligibleForBase(def, base, influence),
  );

  return {
    id,
    base: base.name,
    itemClass: base.itemClass,
    itemLevel: 86,
    attributeBase: base.attributeBase,
    defenceTags: base.defenceTags,
    influence,
    corrupted: false,
    synthesised: false,
    implicits: [],
    prefixes: pickAffixMods(eligible, 'prefix', rngBetween(1, 3)),
    suffixes: pickAffixMods(eligible, 'suffix', rngBetween(1, 3)),
  };
}

export function generateRandomPair(modDb: ModDb): { item1: Item; item2: Item } {
  // Group bases by class.
  const byClass = new Map<string, BaseDef[]>();
  for (const base of BASE_DB.values()) {
    const list = byClass.get(base.itemClass);
    if (list) list.push(base);
    else byClass.set(base.itemClass, [base]);
  }
  // Drop classes with too few bases for an interesting pairing.
  const usable = Array.from(byClass.values()).filter((bs) => bs.length >= 1);
  const classBases = rngPick(usable);

  const base1 = rngPick(classBases);
  // 60% chance of a different base in the same class — increases NNN diversity.
  const base2 = classBases.length > 1 && Math.random() < 0.6
    ? rngPick(classBases.filter((b) => b !== base1))
    : rngPick(classBases);

  const allowsInfluence = INFLUENCEABLE_CLASSES.has(base1.itemClass);
  const inf1 = allowsInfluence && Math.random() < 0.25 ? rngPick(INFLUENCES) : undefined;
  const inf2 = allowsInfluence && Math.random() < 0.25 ? rngPick(INFLUENCES) : undefined;

  return {
    item1: generateOneItem(modDb, base1, inf1),
    item2: generateOneItem(modDb, base2, inf2),
  };
}
