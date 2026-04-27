// src/lib/ui/presets.ts
// Curated example scenarios that demonstrate specific recombinator mechanics from the
// community guide. Each preset constructs Items directly (no parser/db lookup) so the
// scenario is reproducible regardless of how the mod database is built.

import type { Item, Mod } from '$lib/recombinator/index.js';

export type Preset = {
  id: string;
  name: string;
  description: string;
  build: () => { item1: Item; item2: Item };
};

let counter = 0;
const nextId = (): string => `preset_${++counter}_${Math.random().toString(36).slice(2, 8)}`;

type ModSpec = Omit<Mod, 'id'> & { hostItemId?: string };
function mkMod(spec: ModSpec): Mod {
  return { id: nextId(), ...spec };
}

const PRESETS: Preset[] = [
  {
    id: 'spell-suppression-on-str',
    name: 'NNN: Spell suppression locked to dex base',
    description: 'A dex/evasion chest with a spell-suppression suffix paired with a str/armour chest. Suppression is NNN_Defence — it can only land if the dex/evasion base wins the 50/50 pick.',
    build: () => {
      const id1 = 'preset_str_chest';
      const id2 = 'preset_dex_chest';
      const item1: Item = {
        id: id1,
        base: 'Astral Plate',
        itemClass: 'Body Armours',
        itemLevel: 86,
        attributeBase: 'str',
        defenceTags: ['armour'],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({ affix: 'prefix', category: 'RegularExplicit', name: 'Tyrannical', tier: 1, statText: '162% increased Physical Damage' }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of the Drake', tier: 2, statText: '+38% to Fire Resistance' }),
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Argus', tier: 3, statText: '+87 to Strength' }),
        ],
      };
      const item2: Item = {
        id: id2,
        base: "Hyrri's Ire",
        itemClass: 'Body Armours',
        itemLevel: 86,
        attributeBase: 'dex_int',
        defenceTags: ['evasion', 'energy_shield'],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({ affix: 'prefix', category: 'RegularExplicit', name: 'Glittering', tier: 2, statText: '+92 to maximum Energy Shield' }),
        ],
        suffixes: [
          mkMod({
            affix: 'suffix', category: 'NNN_Defence', name: 'of Rebuttal', tier: 1,
            statText: '+10% chance to Suppress Spell Damage', desired: true,
            requiresDefenceTag: 'evasion',
          }),
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Aid', tier: 3, statText: '+62 to maximum Life' }),
        ],
      };
      return { item1, item2 };
    },
  },
  {
    id: 'shaper-boots-fusion',
    name: 'NNN: Shaper mod onto non-influenced base',
    description: 'A Shaper-influenced boot with a Shaper-only mod paired with a regular boot. The Shaper mod is NNN_Influenced — it survives only if the Shaper base is picked.',
    build: () => {
      const id1 = 'preset_shaper_boots';
      const id2 = 'preset_plain_boots';
      const item1: Item = {
        id: id1,
        base: 'Slink Boots',
        itemClass: 'Boots',
        itemLevel: 86,
        attributeBase: 'dex',
        defenceTags: ['evasion'],
        influence: 'shaper',
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({
            affix: 'prefix', category: 'NNN_Influenced', name: "The Shaper's", tier: 1,
            statText: 'Unaffected by Chilled Ground', desired: true,
            requiresInfluence: 'shaper',
          }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of the Whelpling', tier: 4, statText: '+27% to Cold Resistance' }),
        ],
      };
      const item2: Item = {
        id: id2,
        base: 'Slink Boots',
        itemClass: 'Boots',
        itemLevel: 86,
        attributeBase: 'dex',
        defenceTags: ['evasion'],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({ affix: 'prefix', category: 'RegularExplicit', name: 'Sprinting', tier: 2, statText: '30% increased Movement Speed' }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Sprinting', tier: 1, statText: '+47 to maximum Life' }),
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of the Worthy', tier: 3, statText: '+34% to Lightning Resistance' }),
        ],
      };
      return { item1, item2 };
    },
  },
  {
    id: 'exclusive-collision',
    name: 'Exclusive collision: only one survives',
    description: 'Both rings carry an exclusive mod (one crafted, one breach). Only one exclusive can land on the recombined item, so trying to keep both is a losing bet.',
    build: () => {
      const id1 = 'preset_ring1';
      const id2 = 'preset_ring2';
      const item1: Item = {
        id: id1,
        base: 'Two-Stone Ring',
        itemClass: 'Rings',
        itemLevel: 84,
        attributeBase: 'pure',
        defenceTags: [],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({
            affix: 'prefix', category: 'ExclusiveCrafted', name: 'Crafted', tier: null,
            statText: '+50 to maximum Life', desired: true,
          }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of the Drake', tier: 2, statText: '+38% to Fire Resistance' }),
        ],
      };
      const item2: Item = {
        id: id2,
        base: 'Two-Stone Ring',
        itemClass: 'Rings',
        itemLevel: 84,
        attributeBase: 'pure',
        defenceTags: [],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({
            affix: 'prefix', category: 'ExclusiveBreach', name: 'Grasping', tier: 1,
            statText: 'Adds 8 to 14 Physical Damage to Attacks', desired: true,
          }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Aid', tier: 3, statText: '+47 to maximum Life' }),
        ],
      };
      return { item1, item2 };
    },
  },
  {
    id: 'fractured-travel',
    name: 'Fractured: only travels with its host',
    description: 'A fractured "+max mana" mod is tied to its host item. If the other item is picked as the base, the fractured mod simply does not transfer.',
    build: () => {
      const id1 = 'preset_frac_chest';
      const id2 = 'preset_plain_chest';
      const item1: Item = {
        id: id1,
        base: 'Vaal Regalia',
        itemClass: 'Body Armours',
        itemLevel: 86,
        attributeBase: 'int',
        defenceTags: ['energy_shield'],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({
            affix: 'prefix', category: 'Fractured', name: "Mage King's", tier: 1,
            statText: '+140 to maximum Mana', desired: true, hostItemId: id1,
          }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Insulation', tier: 5, statText: '+19% to Cold Resistance' }),
        ],
      };
      const item2: Item = {
        id: id2,
        base: "Sage's Robe",
        itemClass: 'Body Armours',
        itemLevel: 86,
        attributeBase: 'int',
        defenceTags: ['energy_shield'],
        influence: undefined,
        corrupted: false,
        synthesised: false,
        implicits: [],
        prefixes: [
          mkMod({ affix: 'prefix', category: 'RegularExplicit', name: 'Glittering', tier: 2, statText: '+92 to maximum Energy Shield' }),
        ],
        suffixes: [
          mkMod({ affix: 'suffix', category: 'RegularExplicit', name: 'of Stamina', tier: 4, statText: '+35 to maximum Life' }),
        ],
      };
      return { item1, item2 };
    },
  },
];

export function listPresets(): Preset[] {
  return PRESETS;
}

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
