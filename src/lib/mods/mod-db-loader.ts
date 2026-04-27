// src/lib/mods/mod-db-loader.ts
import type { ModDb, ModDef } from './types.js';

export function loadModDb(entries: ModDef[]): ModDb {
  const byId = new Map<string, ModDef>();
  const byNameTierAffix = new Map<string, ModDef>();
  const byNameAffix = new Map<string, ModDef[]>();
  const byStatTemplate = new Map<string, ModDef[]>();

  for (const m of entries) {
    byId.set(m.id, m);
    byNameTierAffix.set(keyNameTierAffix(m.name, m.tier, m.affix), m);
    const naKey = keyNameAffix(m.name, m.affix);
    const naList = byNameAffix.get(naKey);
    if (naList) naList.push(m);
    else byNameAffix.set(naKey, [m]);
    for (const tpl of m.statTemplates) {
      const key = normalizeTemplate(tpl);
      const existing = byStatTemplate.get(key);
      if (existing) existing.push(m);
      else byStatTemplate.set(key, [m]);
    }
  }
  return { byId, byNameTierAffix, byNameAffix, byStatTemplate };
}

function keyNameTierAffix(name: string, tier: number | null, affix: 'prefix' | 'suffix'): string {
  return `${affix} ${name} ${tier ?? 'null'}`;
}

function keyNameAffix(name: string, affix: 'prefix' | 'suffix'): string {
  return `${affix} ${name}`;
}

function normalizeTemplate(tpl: string): string {
  return tpl.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function lookupByNameTierAffix(
  db: ModDb,
  name: string,
  tier: number | null,
  affix: 'prefix' | 'suffix',
): ModDef | undefined {
  const candidates = db.byNameAffix.get(keyNameAffix(name, affix));
  if (!candidates || candidates.length === 0) return undefined;
  // Prefer entries with NNN/influence restrictions — they reflect the categorization-relevant
  // variant for armour pieces. (Clipboard tier doesn't reliably disambiguate variants since it's
  // computed per-item-class while our tier is rank-within-type.)
  const restricted = candidates.find(
    (m) => m.defenceRestriction || m.attributeRestriction || m.influenceRestriction,
  );
  if (restricted) return restricted;
  // No restricted variant exists — fall back to exact tier match, then any.
  const exact = db.byNameTierAffix.get(keyNameTierAffix(name, tier, affix));
  return exact ?? candidates[0];
}

export function lookupByStatLine(db: ModDb, statLine: string): ModDef[] {
  const template = normalizeTemplate(statLine.replace(/[+-]?\d+(?:\.\d+)?/g, '#'));
  return db.byStatTemplate.get(template) ?? [];
}
