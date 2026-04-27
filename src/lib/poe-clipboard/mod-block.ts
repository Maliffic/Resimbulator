// src/lib/poe-clipboard/mod-block.ts
import type { ParsedMod, ModFlag } from './types.js';

const HINT_LINE = /^\{\s*(.+?)\s*\}$/;
const TIER_RE = /\(Tier:\s*(\d+)\)/;
const HINT_FLAGS: { keyword: string; flag: ModFlag }[] = [
  { keyword: 'Crafted', flag: 'crafted' },
  { keyword: 'Veiled', flag: 'veiled' },
  { keyword: 'Fractured', flag: 'fractured' },
  { keyword: 'Implicit', flag: 'implicit' },
];

// Lines that appear at the end of a mod block (no `--------` separator) but represent item-level
// flags rather than mod stat-text. They should terminate the current mod's statLines collection.
function isTrailingItemFlag(line: string): boolean {
  const t = line.trim();
  return /\bItem$/.test(t) || t === 'Corrupted' || t === 'Mirrored' || t === 'Split';
}

type Hint = NonNullable<ParsedMod['hint']> & { affix: ParsedMod['affix'] };

function parseHint(line: string): Hint | undefined {
  const m = HINT_LINE.exec(line);
  if (!m) return undefined;
  const inner = m[1]!;

  // Determine affix
  let affix: ParsedMod['affix'] = 'unknown';
  if (/Implicit/i.test(inner)) affix = 'implicit';
  else if (/Suffix/i.test(inner)) affix = 'suffix';
  else if (/Prefix/i.test(inner)) affix = 'prefix';

  // Flags (Crafted, Veiled, Fractured, Implicit)
  const flags: ModFlag[] = HINT_FLAGS.filter(({ keyword }) =>
    new RegExp(`\\b${keyword}\\b`).test(inner),
  ).map((f) => f.flag);

  // Mod name (between quotes), if present
  const nameMatch = /"([^"]+)"/.exec(inner);
  const name = nameMatch?.[1] ?? '';

  // Tier (or null for untiered essences)
  const tierMatch = TIER_RE.exec(inner);
  const tier = tierMatch ? parseInt(tierMatch[1]!, 10) : null;

  // Tags after the em-dash
  let tags: string[] = [];
  const dashIdx = inner.indexOf('—');
  if (dashIdx >= 0) {
    tags = inner
      .slice(dashIdx + 1)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  return { affix, name, tier, tags, flags };
}

export function parseModSection(section: string[]): ParsedMod[] {
  const mods: ParsedMod[] = [];
  let i = 0;
  while (i < section.length) {
    const line = section[i]!;
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (isTrailingItemFlag(line)) {
      // Item-level flags appended without a separator — skip, they're not mod stat text.
      i++;
      continue;
    }
    const hint = parseHint(line);
    if (hint) {
      i++;
      const statLines: string[] = [];
      while (
        i < section.length
        && !HINT_LINE.test(section[i]!)
        && !isTrailingItemFlag(section[i]!)
      ) {
        const next = section[i]!;
        if (next.trim() !== '') statLines.push(next);
        i++;
      }
      const { affix, name, tier, tags, flags } = hint;
      mods.push({ affix, hint: { name, tier, tags, flags }, statLines });
    } else {
      // Inline marker fallback: hints OFF or single-line annotated mod.
      // Implicits and enchants both stick with the base (don't enter the prefix/suffix pool),
      // so route enchants through the implicit affix.
      const inline = line;
      const isImplicit = /\((implicit|enchant)\)/i.test(inline);
      mods.push({
        affix: isImplicit ? 'implicit' : 'unknown',
        statLines: [inline],
      });
      i++;
    }
  }
  return mods;
}
