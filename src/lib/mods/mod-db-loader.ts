// src/lib/mods/mod-db-loader.ts
import type { ModDb, ModDef } from './types.js';

export function loadModDb(entries: ModDef[]): ModDb {
  const byId = new Map<string, ModDef>();
  const byNameTierAffix = new Map<string, ModDef>();
  const byStatTemplate = new Map<string, ModDef[]>();

  for (const m of entries) {
    byId.set(m.id, m);
    byNameTierAffix.set(keyNameTierAffix(m.name, m.tier, m.affix), m);
    for (const tpl of m.statTemplates) {
      const key = normalizeTemplate(tpl);
      const existing = byStatTemplate.get(key);
      if (existing) existing.push(m);
      else byStatTemplate.set(key, [m]);
    }
  }
  return { byId, byNameTierAffix, byStatTemplate };
}

function keyNameTierAffix(name: string, tier: number | null, affix: 'prefix' | 'suffix'): string {
  return `${affix} ${name} ${tier ?? 'null'}`;
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
  return db.byNameTierAffix.get(keyNameTierAffix(name, tier, affix));
}

export function lookupByStatLine(db: ModDb, statLine: string): ModDef[] {
  const template = normalizeTemplate(statLine.replace(/[+\-]?\d+(?:\.\d+)?/g, '#'));
  return db.byStatTemplate.get(template) ?? [];
}
