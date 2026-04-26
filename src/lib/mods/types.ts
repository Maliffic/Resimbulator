// src/lib/mods/types.ts
import type { AttributeBase, DefenceTag, Influence } from '../recombinator/index.js';

/**
 * One entry in the mod database — derived from RePoE.
 */
export type ModDef = {
  /** RePoE mod id (e.g. 'TyrannicalDamage1') */
  id: string;
  /** Display name shown in clipboard hints (e.g. 'Tyrannical') */
  name: string;
  affix: 'prefix' | 'suffix';
  /** Null for untiered (essence) mods. */
  tier: number | null;
  /** Tags from RePoE (e.g. ['damage', 'attack', 'physical']) */
  tags: string[];
  /** RePoE generation_type. Drives Influenced and Crafted detection. */
  generationType: GenerationType;
  /** RePoE domain. Drives Breach / Incursion / Delve detection. */
  domain: ModDomain;
  /** Stat-text templates for matching parser stat lines (e.g. '#% increased Physical Damage'). */
  statTemplates: string[];
  /** Optional source markers — set when the mod is gated on attribute or defence tags. */
  attributeRestriction?: AttributeBase[];
  defenceRestriction?: DefenceTag[];
  influenceRestriction?: Influence;
};

export type GenerationType =
  | 'prefix' | 'suffix'
  | 'crafted'
  | 'shaper' | 'elder' | 'crusader' | 'hunter' | 'warlord' | 'redeemer'
  | 'enchant' | 'corrupted'
  | 'unique';

export type ModDomain =
  | 'item' | 'crafted' | 'veiled'
  | 'breach' | 'incursion' | 'delve'
  | 'flask' | 'jewel' | 'misc';

/**
 * One entry in the base-items database — hand-curated for v1.
 */
export type BaseDef = {
  /** Display name (e.g. 'Sacrificial Garb') */
  name: string;
  itemClass: string;
  attributeBase: AttributeBase;
  defenceTags: DefenceTag[];
};

export type ModDb = {
  /** Lookup by mod name + tier + affix. Most common path when type hints are present. */
  byNameTierAffix: Map<string, ModDef>;
  /** Lookup by id. */
  byId: Map<string, ModDef>;
  /** Lookup by stat-text template (regex-stringified) for type-hints-off fallback. */
  byStatTemplate: Map<string, ModDef[]>;
};

export type BaseDb = Map<string, BaseDef>;
