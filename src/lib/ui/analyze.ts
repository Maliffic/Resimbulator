// src/lib/ui/analyze.ts
// Helpers for the Compare and Plan tabs — distill a saved scenario down to its
// chance / expected-attempts / cost summary.

import type { Item, Mod } from '$lib/recombinator/index.js';
import { probabilityExactByBase } from '$lib/recombinator/index.js';
import type { SavedScenario, WorkflowStage } from './persist.js';

export type ScenarioAnalysis = {
  chance: number;
  fromBase1: number;
  fromBase2: number;
  desiredCount: number;
  expectedTries: number;     // 1 / chance, ∞ when chance is 0
  expectedCost: number;      // expectedTries × costPerTry, ∞ when chance is 0
  /** Compatible item-class? false → recombine is impossible. */
  compatible: boolean;
};

function desiredFrom(item1: Item, item2: Item): Mod[] {
  return [
    ...item1.prefixes, ...item1.suffixes,
    ...item2.prefixes, ...item2.suffixes,
  ].filter((m) => m.desired === true);
}

export function analyzeScenario(item1: Item, item2: Item, costPerTry: number): ScenarioAnalysis {
  const compatible = item1.itemClass === item2.itemClass;
  if (!compatible) {
    return {
      chance: 0, fromBase1: 0, fromBase2: 0,
      desiredCount: desiredFrom(item1, item2).length,
      expectedTries: Infinity, expectedCost: Infinity,
      compatible: false,
    };
  }

  const desired = desiredFrom(item1, item2);
  if (desired.length === 0) {
    return {
      chance: 1, fromBase1: 1, fromBase2: 1,
      desiredCount: 0,
      expectedTries: 1, expectedCost: costPerTry,
      compatible: true,
    };
  }

  const split = probabilityExactByBase(item1, item2, desired);
  const expectedTries = split.weighted > 0 ? 1 / split.weighted : Infinity;
  const expectedCost = split.weighted > 0 ? expectedTries * costPerTry : Infinity;
  return {
    chance: split.weighted,
    fromBase1: split.fromItem1,
    fromBase2: split.fromItem2,
    desiredCount: desired.length,
    expectedTries,
    expectedCost,
    compatible: true,
  };
}

export type WorkflowStageAnalysis = {
  stage: WorkflowStage;
  /** The saved scenario, or undefined if it was deleted. */
  scenario: SavedScenario | undefined;
  /** Per-stage analysis (own attempts only). */
  own: ScenarioAnalysis | null;
  /** Sum of (own + all transitive parents) tries / cost — what it costs to *produce one successful result of this stage*. */
  cumulativeTries: number;
  cumulativeCost: number;
  /** True when the stage references a missing scenario or has a cycle/dangling parent. */
  invalid: boolean;
  invalidReason?: string;
};

export type WorkflowAnalysis = {
  stages: WorkflowStageAnalysis[];
  /** True when the stage list contains cycles or unresolvable parent references. */
  hasCycles: boolean;
};

function safeAdd(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return a + b;
}

export function analyzeWorkflow(
  stages: WorkflowStage[],
  scenarios: SavedScenario[],
  costPerTry: number,
): WorkflowAnalysis {
  const byName = new Map(scenarios.map((s) => [s.name, s]));
  const stageById = new Map(stages.map((s) => [s.id, s]));

  // Topological sort with cycle detection.
  const order: string[] = [];
  const visited = new Map<string, 'visiting' | 'done'>();
  let cycle = false;
  function visit(id: string) {
    const status = visited.get(id);
    if (status === 'done') return;
    if (status === 'visiting') { cycle = true; return; }
    visited.set(id, 'visiting');
    const node = stageById.get(id);
    if (node) for (const p of node.parentIds) visit(p);
    visited.set(id, 'done');
    order.push(id);
  }
  for (const s of stages) visit(s.id);

  const results = new Map<string, WorkflowStageAnalysis>();
  for (const id of order) {
    const stage = stageById.get(id);
    if (!stage) continue;
    const sc = byName.get(stage.scenarioName);
    if (!sc) {
      results.set(id, {
        stage, scenario: undefined, own: null,
        cumulativeTries: Infinity, cumulativeCost: Infinity,
        invalid: true, invalidReason: 'scenario was deleted',
      });
      continue;
    }
    const own = analyzeScenario(sc.item1, sc.item2, costPerTry);
    let parentTries = 0;
    let parentCost = 0;
    let parentInvalid = false;
    for (const pid of stage.parentIds) {
      const p = results.get(pid);
      if (!p) { parentInvalid = true; continue; }
      if (p.invalid) parentInvalid = true;
      parentTries = safeAdd(parentTries, p.cumulativeTries);
      parentCost = safeAdd(parentCost, p.cumulativeCost);
    }
    results.set(id, {
      stage, scenario: sc, own,
      cumulativeTries: safeAdd(parentTries, own.expectedTries),
      cumulativeCost: safeAdd(parentCost, own.expectedCost),
      invalid: parentInvalid,
      ...(parentInvalid ? { invalidReason: 'an ancestor stage is invalid' } : {}),
    });
  }

  // Return stages in the same order the user inputted (not topo) so the table is stable.
  const ordered: WorkflowStageAnalysis[] = stages.map((s) => results.get(s.id)).filter(
    (r): r is WorkflowStageAnalysis => r !== undefined,
  );
  return { stages: ordered, hasCycles: cycle };
}
