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
  { name: "Kaom's Plate",       itemClass: 'Body Armours', attributeBase: 'str',     defenceTags: ['armour'] },
  // Body Armours — STR/INT
  { name: 'Sacrificial Garb',   itemClass: 'Body Armours', attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'] },
  { name: "Saint's Hauberk",    itemClass: 'Body Armours', attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'] },
  // Body Armours — INT
  { name: 'Vaal Regalia',       itemClass: 'Body Armours', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: "Sage's Robe",        itemClass: 'Body Armours', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  // Body Armours — DEX/INT
  { name: 'Carnal Armour',      itemClass: 'Body Armours', attributeBase: 'dex_int', defenceTags: ['evasion', 'energy_shield'] },
  { name: "Hyrri's Ire",        itemClass: 'Body Armours', attributeBase: 'dex_int', defenceTags: ['evasion', 'energy_shield'] },
  // Body Armours — STR/DEX
  { name: 'Full Dragonscale',   itemClass: 'Body Armours', attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  // Gloves
  { name: 'Goliath Gauntlets',  itemClass: 'Gloves',       attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Sorcerer Gloves',    itemClass: 'Gloves',       attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Hydrascale Gauntlets', itemClass: 'Gloves',     attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  { name: 'Stealth Gloves',     itemClass: 'Gloves',       attributeBase: 'dex',     defenceTags: ['evasion'] },
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
  // Shields — INT (energy shield)
  { name: 'Spirit Shield',          itemClass: 'Shields', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Vaal Spirit Shield',     itemClass: 'Shields', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  { name: 'Titanium Spirit Shield', itemClass: 'Shields', attributeBase: 'int',     defenceTags: ['energy_shield'] },
  // Shields — DEX (evasion)
  { name: 'Buckler',           itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Painted Buckler',   itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Hammered Buckler',  itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'War Buckler',       itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Gilded Buckler',    itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Oak Buckler',       itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Enameled Buckler',  itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Corrugated Buckler',itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Battle Buckler',    itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Golden Buckler',    itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Ironwood Buckler',  itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Lacquered Buckler', itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Vaal Buckler',      itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  { name: 'Crusader Buckler',  itemClass: 'Shields', attributeBase: 'dex',     defenceTags: ['evasion'] },
  // Shields — STR (armour)
  { name: 'Tower Shield',      itemClass: 'Shields', attributeBase: 'str',     defenceTags: ['armour'] },
  { name: 'Pinnacle Tower Shield', itemClass: 'Shields', attributeBase: 'str', defenceTags: ['armour'] },
  // Shields — STR/INT (armour + ES)
  { name: 'Lacquered Garb',    itemClass: 'Shields', attributeBase: 'str_int', defenceTags: ['armour', 'energy_shield'] },
  // Shields — STR/DEX (armour + evasion)
  { name: 'Two-Stone Shield',  itemClass: 'Shields', attributeBase: 'str_dex', defenceTags: ['armour', 'evasion'] },
  // Shields — DEX/INT (evasion + ES)
  { name: 'Walnut Shield',     itemClass: 'Shields', attributeBase: 'dex_int', defenceTags: ['evasion', 'energy_shield'] },
];

// Synthesised items prepend a prefix word to the base name (e.g. "Transfer-attuned Spirit Shield").
// Strip these so synthesised bases still resolve.
const SYNTHESIS_PREFIXES: readonly string[] = [
  'Transfer-attuned', 'Mirrored', 'Flaring', 'Subsuming', 'Enduring', 'Echoing',
  'Stalwart', 'Otherworldly', 'Foreboding', 'Glimmering', 'Vital', 'Surging',
  'Twilight', 'Ageless', 'Stout', 'Blasphemous', 'Searching', 'Veiled',
  'Whispering', 'Awakened', 'Ancient', 'Charged', 'Toxic', 'Auspicious',
];

export const BASE_DB: BaseDb = new Map(ENTRIES.map((e) => [e.name, e]));

export function lookupBase(name: string): BaseDef | undefined {
  const direct = BASE_DB.get(name);
  if (direct) return direct;
  // Try stripping a synthesised prefix word.
  for (const p of SYNTHESIS_PREFIXES) {
    if (name.startsWith(`${p} `)) {
      const stripped = name.slice(p.length + 1);
      const hit = BASE_DB.get(stripped);
      if (hit) return hit;
    }
  }
  return undefined;
}
