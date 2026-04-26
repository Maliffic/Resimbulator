// src/lib/ui/mod-db-fetch.ts
import type { ModDef, ModDb } from '$lib/mods/index.js';
import { loadModDb } from '$lib/mods/index.js';

const DB_NAME = 'resimbulator';
const DB_VERSION = 1;
const STORE = 'mod-db';
const KEY = 'singleton';

export async function loadFromCache(): Promise<ModDef[] | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, 'readonly');
      const get = tx.objectStore(STORE).get(KEY);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveToCache(entries: ModDef[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entries, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

export async function loadModDbFromNetwork(): Promise<ModDef[]> {
  for (const path of ['/mod-db.json', '/mod-db-fixture.json']) {
    try {
      const res = await fetch(path);
      if (res.ok) return await res.json();
    } catch {
      // try next
    }
  }
  throw new Error('Failed to load mod-db.json');
}

export async function getModDb(): Promise<ModDb> {
  const cached = await loadFromCache();
  if (cached) return loadModDb(cached);

  const fresh = await loadModDbFromNetwork();
  await saveToCache(fresh);
  return loadModDb(fresh);
}
