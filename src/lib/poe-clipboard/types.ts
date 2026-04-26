// src/lib/poe-clipboard/types.ts

export type Rarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer';

export type ParsedHeader = {
  rarity: Rarity;
  itemClass: string;
  /** For rare/unique: the prefix-suffix line (e.g. "Cataclysm Veil"). For magic: the magic-mod modified base name. */
  name: string;
  /** The base type (e.g. "Sacrificial Garb"). For unique items, this is the unique's base. */
  base: string;
  influence?: Influence;
  itemLevel: number;
  quality?: number;
  corrupted: boolean;
  synthesised: boolean;
};

export type ModFlag = 'crafted' | 'veiled' | 'fractured' | 'implicit';

export type ParsedMod = {
  affix: 'prefix' | 'suffix' | 'implicit' | 'unknown';
  /** Set when type hints are present in the clipboard. */
  hint?: {
    name: string;
    /** Null for untiered mods (essences). */
    tier: number | null;
    tags: string[];
    flags: ModFlag[];
  };
  /** The 1+ stat lines that follow the type-hint block (or stand alone if hints are off). */
  statLines: string[];
};

export type ParsedItem = ParsedHeader & {
  implicits: ParsedMod[];
  prefixes: ParsedMod[];
  suffixes: ParsedMod[];
  /** Mods whose affix couldn't be determined (e.g. type hints off and no inline marker). Plan 3's categorizer will resolve these. */
  unknown: ParsedMod[];
};
