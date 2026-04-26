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
];

export const BASE_DB: BaseDb = new Map(ENTRIES.map((e) => [e.name, e]));

export function lookupBase(name: string): BaseDef | undefined {
  return BASE_DB.get(name);
}
