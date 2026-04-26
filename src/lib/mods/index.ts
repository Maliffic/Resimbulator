// src/lib/mods/index.ts
export type { ModDef, BaseDef, ModDb, BaseDb, GenerationType, ModDomain } from './types.js';
export { BASE_DB, lookupBase } from './base-db.js';
export { loadModDb, lookupByNameTierAffix, lookupByStatLine } from './mod-db-loader.js';
export { categorize } from './categorize.js';
export type { CategorizeResult } from './categorize.js';
export { translate } from './translate.js';
