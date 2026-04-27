// src/lib/ui/persist.ts
import type { Item } from '$lib/recombinator/index.js';

const KEY = 'Resimbinator :state:v1';
const SCENARIOS_KEY = 'Resimbinator :scenarios:v1';
const WORKFLOW_KEY = 'Resimbinator :workflow:v1';

export type PersistedState = {
  item1: Item | null;
  item2: Item | null;
  costPerTry?: number;
};

export type SavedScenario = {
  name: string;
  savedAt: number;
  item1: Item;
  item2: Item;
};

export function saveState(state: PersistedState, storage: Storage): void {
  try {
    storage.setItem(KEY, JSON.stringify({ schemaVersion: 1, ...state }));
  } catch {
    // Storage may be full or disabled; silently ignore.
  }
}

export function loadState(storage: Storage): PersistedState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { item1: null, item2: null };
    const parsed = JSON.parse(raw) as PersistedState & { schemaVersion?: number };
    const out: PersistedState = { item1: parsed.item1 ?? null, item2: parsed.item2 ?? null };
    if (typeof parsed.costPerTry === 'number') out.costPerTry = parsed.costPerTry;
    return out;
  } catch {
    return { item1: null, item2: null };
  }
}

export function loadScenarios(storage: Storage): SavedScenario[] {
  try {
    const raw = storage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedScenario[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: SavedScenario[], storage: Storage): void {
  try {
    storage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  } catch {
    // ignore
  }
}

/** A single in-progress workflow — one DAG of stages. v1 holds one at a time. */
export type WorkflowStage = {
  id: string;
  scenarioName: string;
  parentIds: string[];
};

export function loadWorkflow(storage: Storage): WorkflowStage[] {
  try {
    const raw = storage.getItem(WORKFLOW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkflowStage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkflow(stages: WorkflowStage[], storage: Storage): void {
  try {
    storage.setItem(WORKFLOW_KEY, JSON.stringify(stages));
  } catch {
    // ignore
  }
}
