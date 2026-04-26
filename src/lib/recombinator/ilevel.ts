// src/lib/recombinator/ilevel.ts

/**
 * Item-level formula from guide.txt §2:
 *   floor((ilvl1 + ilvl2) / 2) + 2, capped at max(ilvl1, ilvl2).
 */
export function computeItemLevel(ilvl1: number, ilvl2: number): number {
  const raw = Math.floor((ilvl1 + ilvl2) / 2) + 2;
  return Math.min(raw, Math.max(ilvl1, ilvl2));
}
