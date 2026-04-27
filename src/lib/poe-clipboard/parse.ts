// src/lib/poe-clipboard/parse.ts
import type { ParsedItem, ParsedMod } from './types.js';
import { tokenize } from './tokenize.js';
import { parseHeader } from './header.js';
import { parseModSection } from './mod-block.js';
import {
  detectCorrupted, detectSynthesised, detectInfluence, parseItemLevel, parseQuality,
} from './flags.js';

const METADATA_PREFIXES = [
  'Item Class:', 'Rarity:', 'Quality', 'Armour:', 'Energy Shield:', 'Evasion Rating:',
  'Ward:', 'Block:', 'Chance to Block:', 'Critical Strike Chance:', 'Attacks per Second:',
  'Physical Damage:', 'Elemental Damage:', 'Chaos Damage:',
  'Requirements:', 'Level:', 'Str:', 'Dex:', 'Int:',
  'Sockets:', 'Item Level:', 'Talisman Tier:',
];

function isMetadataSection(section: string[]): boolean {
  if (section.some((l) => /^\{.+\}$/.test(l.trim()))) return false;
  return section.every((l) =>
    METADATA_PREFIXES.some((p) => l.trim().startsWith(p)),
  );
}

function isStandaloneFlagSection(section: string[]): boolean {
  if (section.length !== 1) return false;
  const line = section[0]!.trim();
  return line === 'Corrupted' || line === 'Synthesised Item' ||
    line === 'Mirrored' || line === 'Split' ||
    /\bItem$/.test(line); // catches "Warlord Item" etc.
}

export function parse(input: string): ParsedItem {
  const sections = tokenize(input);
  if (sections.length === 0) throw new Error('Empty clipboard input');

  const header = parseHeader(sections[0]!);
  const itemLevel = parseItemLevel(sections);
  const quality = parseQuality(sections);
  const influence = detectInfluence(sections);
  const corrupted = detectCorrupted(sections);
  const synthesised = detectSynthesised(sections);

  const prefixes: ParsedMod[] = [];
  const suffixes: ParsedMod[] = [];
  const implicits: ParsedMod[] = [];
  const unknown: ParsedMod[] = [];

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i]!;
    if (isMetadataSection(sec) || isStandaloneFlagSection(sec)) continue;
    const mods = parseModSection(sec);
    for (const m of mods) {
      if (m.affix === 'prefix') prefixes.push(m);
      else if (m.affix === 'suffix') suffixes.push(m);
      else if (m.affix === 'implicit') implicits.push(m);
      else unknown.push(m);
    }
  }

  const out: ParsedItem = {
    rarity: header.rarity,
    itemClass: header.itemClass,
    name: header.name,
    base: header.base,
    itemLevel,
    corrupted,
    synthesised,
    implicits, prefixes, suffixes, unknown,
  };
  if (influence !== undefined) out.influence = influence;
  if (quality !== undefined) out.quality = quality;
  return out;
}
