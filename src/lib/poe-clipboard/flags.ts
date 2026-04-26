// src/lib/poe-clipboard/flags.ts
import type { Influence } from './types.js';

const INFLUENCE_MAP: Record<string, Influence> = {
  'Shaper Item': 'shaper',
  'Elder Item': 'elder',
  'Crusader Item': 'crusader',
  'Hunter Item': 'hunter',
  'Warlord Item': 'warlord',
  'Redeemer Item': 'redeemer',
};

export function detectCorrupted(sections: string[][]): boolean {
  return sections.some((sec) => sec.some((l) => l.trim() === 'Corrupted'));
}

export function detectSynthesised(sections: string[][]): boolean {
  return sections.some((sec) => sec.some((l) => l.trim() === 'Synthesised Item'));
}

export function detectInfluence(sections: string[][]): Influence | undefined {
  for (const sec of sections) {
    for (const line of sec) {
      const inf = INFLUENCE_MAP[line.trim()];
      if (inf) return inf;
    }
  }
  return undefined;
}

export function parseItemLevel(sections: string[][]): number {
  for (const sec of sections) {
    for (const line of sec) {
      const m = /^Item Level:\s*(\d+)$/.exec(line.trim());
      if (m) return parseInt(m[1]!, 10);
    }
  }
  throw new Error('No Item Level line found in clipboard text');
}

export function parseQuality(sections: string[][]): number | undefined {
  for (const sec of sections) {
    for (const line of sec) {
      const m = /^Quality:\s*\+(\d+)%/.exec(line.trim());
      if (m) return parseInt(m[1]!, 10);
    }
  }
  return undefined;
}
