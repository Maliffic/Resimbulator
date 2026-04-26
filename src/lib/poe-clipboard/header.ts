// src/lib/poe-clipboard/header.ts
import type { Rarity } from './types.js';

const VALID_RARITIES: ReadonlySet<Rarity> = new Set(['Normal', 'Magic', 'Rare', 'Unique']);

export function parseHeader(section: string[]): {
  rarity: Rarity;
  itemClass: string;
  name: string;
  base: string;
} {
  const itemClassLine = section.find((l) => l.startsWith('Item Class:'));
  const rarityLine = section.find((l) => l.startsWith('Rarity:'));
  if (!rarityLine) throw new Error('Header section missing Rarity line');

  const rarity = rarityLine.replace('Rarity:', '').trim() as Rarity;
  if (!VALID_RARITIES.has(rarity)) throw new Error(`Unknown rarity: ${rarity}`);

  const itemClass = itemClassLine ? itemClassLine.replace('Item Class:', '').trim() : '';

  const nameLines = section.filter(
    (l) => !l.startsWith('Item Class:') && !l.startsWith('Rarity:'),
  );

  let name: string;
  let base: string;
  if (rarity === 'Rare' || rarity === 'Unique') {
    name = nameLines[0] ?? '';
    base = nameLines[1] ?? name;
  } else {
    name = nameLines[0] ?? '';
    base = name;
  }

  return { rarity, itemClass, name, base };
}
