// src/lib/ui/state.ts
//
// Plain-TS helpers for the app's state. The reactivity wrapper ($state) lives in the
// Svelte component that owns the state; these helpers operate on a snapshot.

import type { Item, Mod } from '$lib/recombinator/index.js';
import { probabilityExact, probabilityExactByBase } from '$lib/recombinator/index.js';

export type Settings = {
  batchSimTrials: number;
  costPerTry: number;
};

export const DEFAULT_SETTINGS: Settings = {
  batchSimTrials: 1000,
  costPerTry: 0.5,
};

export type AppState = {
  item1: Item | null;
  item2: Item | null;
  settings: Settings;
};

export function createEmptyState(): AppState {
  return { item1: null, item2: null, settings: { ...DEFAULT_SETTINGS } };
}

export function setItem(state: AppState, slot: 1 | 2, item: Item | null): void {
  if (slot === 1) state.item1 = item;
  else state.item2 = item;
}

export function toggleDesired(state: AppState, itemId: string, modId: string): void {
  const flipMod = (it: Item | null) => {
    if (!it || it.id !== itemId) return;
    const flip = (mods: Item['prefixes']) =>
      mods.map((m) => (m.id === modId ? { ...m, desired: !m.desired } : m));
    it.prefixes = flip(it.prefixes);
    it.suffixes = flip(it.suffixes);
    it.implicits = flip(it.implicits);
  };
  flipMod(state.item1);
  flipMod(state.item2);
}

export function reset(state: AppState): void {
  state.item1 = null;
  state.item2 = null;
}

export function removeMod(state: AppState, itemId: string, modId: string): void {
  const stripFrom = (it: Item | null) => {
    if (!it || it.id !== itemId) return;
    it.prefixes = it.prefixes.filter((m) => m.id !== modId);
    it.suffixes = it.suffixes.filter((m) => m.id !== modId);
    it.implicits = it.implicits.filter((m) => m.id !== modId);
  };
  stripFrom(state.item1);
  stripFrom(state.item2);
}

export function addMod(state: AppState, itemId: string, mod: Mod): void {
  const addTo = (it: Item | null) => {
    if (!it || it.id !== itemId) return;
    if (mod.affix === 'prefix' && it.prefixes.length < 3) it.prefixes = [...it.prefixes, mod];
    else if (mod.affix === 'suffix' && it.suffixes.length < 3) it.suffixes = [...it.suffixes, mod];
  };
  addTo(state.item1);
  addTo(state.item2);
}

export function allDesiredMods(state: AppState): Item['prefixes'] {
  const all = [
    ...(state.item1?.prefixes ?? []), ...(state.item1?.suffixes ?? []),
    ...(state.item2?.prefixes ?? []), ...(state.item2?.suffixes ?? []),
  ];
  return all.filter((m) => m.desired === true);
}

export function computeChance(state: AppState): number {
  if (!state.item1 || !state.item2) return 0;
  const desired = allDesiredMods(state);
  if (desired.length === 0) return 1;
  return probabilityExact(state.item1, state.item2, desired);
}

export function computeChanceByBase(state: AppState): { fromItem1: number; fromItem2: number; weighted: number } {
  if (!state.item1 || !state.item2) return { fromItem1: 0, fromItem2: 0, weighted: 0 };
  const desired = allDesiredMods(state);
  if (desired.length === 0) return { fromItem1: 1, fromItem2: 1, weighted: 1 };
  return probabilityExactByBase(state.item1, state.item2, desired);
}
