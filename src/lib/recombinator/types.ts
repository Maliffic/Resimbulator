// src/lib/recombinator/types.ts

export type Affix = 'prefix' | 'suffix' | 'implicit';

export type ModCategory =
  | 'RegularExplicit'
  | 'ExclusiveCrafted'
  | 'ExclusiveVeiled'
  | 'ExclusiveEssence'
  | 'ExclusiveBreach'
  | 'ExclusiveIncursion'
  | 'ExclusiveBeastAspect'
  | 'ExclusiveDelve'
  | 'ExclusiveElevated'
  | 'NNN_Influenced'
  | 'NNN_Defence'
  | 'NNN_Attribute'
  | 'Fractured'
  | 'Implicit';

export type AttributeBase = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int' | 'pure';

export type DefenceTag = 'armour' | 'evasion' | 'energy_shield';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer';

export type Mod = {
  id: string;
  affix: Affix;
  category: ModCategory;
  name: string;
  tier: number | null;
  statText: string;
  /** For Fractured mods: the input item id this mod must travel with. */
  hostItemId?: string;
  /** For NNN_Influenced: required influence on the chosen base. */
  requiresInfluence?: Influence;
  /** For NNN_Defence: required defence tags on the chosen base. */
  requiresDefenceTag?: DefenceTag;
  /** For NNN_Attribute: which attribute bases this mod is allowed on. */
  allowedAttributeBases?: AttributeBase[];
  /** Marker for desired-mod selection in probability calc. Not part of the math. */
  desired?: boolean;
};

export type Item = {
  id: string;
  base: string;
  itemClass: string;
  itemLevel: number;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
  influence: Influence | undefined;
  corrupted: boolean;
  synthesised: boolean;
  implicits: Mod[];
  prefixes: Mod[];
  suffixes: Mod[];
};

export type BaseContext = {
  base: string;
  itemClass: string;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
  influence: Influence | undefined;
  itemLevel: number;
  hostItemId: string;
};

export type RecombineInput = { item1: Item; item2: Item };

export type RecombineResult = {
  baseFromItem: 1 | 2;
  baseContext: BaseContext;
  prefixes: Mod[];
  suffixes: Mod[];
  itemLevel: number;
};
