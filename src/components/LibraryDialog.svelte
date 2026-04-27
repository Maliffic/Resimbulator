<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import type { SavedScenario } from '$lib/ui/persist.js';
  import { listPresets } from '$lib/ui/presets.js';
  import { analyzeScenario } from '$lib/ui/analyze.js';

  type Props = {
    item1: Item | null;
    item2: Item | null;
    saved: SavedScenario[];
    costPerTry: number;
    onClose: () => void;
    onLoad: (item1: Item, item2: Item) => void;
    onSave: (name: string) => void;
    onDelete: (name: string) => void;
  };

  let { item1, item2, saved, costPerTry, onClose, onLoad, onSave, onDelete }: Props = $props();

  type Tab = 'examples' | 'saved' | 'compare' | 'plan';
  let tab = $state<Tab>('examples');
  let saveName = $state('');
  let compareSelection = $state<Set<string>>(new Set());
  let planSequence = $state<string[]>([]);

  const presets = listPresets();
  const canSave = $derived(item1 !== null && item2 !== null);

  const compareRows = $derived.by(() => {
    return saved
      .filter((s) => compareSelection.has(s.name))
      .map((s) => ({ scenario: s, analysis: analyzeScenario(s.item1, s.item2, costPerTry) }));
  });

  const planRows = $derived.by(() => {
    let cumulative = 0;
    return planSequence.map((name) => {
      const sc = saved.find((s) => s.name === name);
      if (!sc) return null;
      const a = analyzeScenario(sc.item1, sc.item2, costPerTry);
      const stepCost = Number.isFinite(a.expectedCost) ? a.expectedCost : Infinity;
      cumulative = Number.isFinite(cumulative + stepCost) ? cumulative + stepCost : Infinity;
      return { scenario: sc, analysis: a, cumulative };
    }).filter((r): r is { scenario: SavedScenario; analysis: ReturnType<typeof analyzeScenario>; cumulative: number } => r !== null);
  });

  const planTotalTries = $derived(planRows.reduce((acc, r) => acc + (Number.isFinite(r.analysis.expectedTries) ? r.analysis.expectedTries : Infinity), 0));
  const planTotalCost = $derived(planRows.reduce((acc, r) => Number.isFinite(acc + r.analysis.expectedCost) ? acc + r.analysis.expectedCost : Infinity, 0));

  function toggleCompare(name: string) {
    const next = new Set(compareSelection);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    compareSelection = next;
  }

  function addToPlan(name: string) {
    planSequence = [...planSequence, name];
  }
  function removeFromPlan(idx: number) {
    planSequence = planSequence.filter((_, i) => i !== idx);
  }
  function movePlanStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= planSequence.length) return;
    const next = [...planSequence];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    planSequence = next;
  }

  function fmtNum(n: number, digits = 1): string {
    if (!Number.isFinite(n)) return '∞';
    return n.toFixed(digits);
  }
  function pct(n: number): string {
    if (!Number.isFinite(n)) return '∞';
    return `${(n * 100).toFixed(1)}%`;
  }

  function handleLoadPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    const { item1: a, item2: b } = preset.build();
    onLoad(a, b);
    onClose();
  }

  function handleLoadSaved(s: SavedScenario) {
    onLoad(s.item1, s.item2);
    onClose();
  }

  function handleSave() {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    saveName = '';
  }
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/60"
    onclick={(e) => e.stopPropagation()}
    role="presentation">
    <div class="flex items-baseline justify-between border-b border-poe-border pb-2 mb-4">
      <div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim">Library</div>
        <div class="text-base font-semibold text-poe-rare">Scenarios</div>
      </div>
      <button class="text-poe-deepdim hover:text-poe-text text-xl leading-none" onclick={onClose} aria-label="close">×</button>
    </div>

    <div class="flex flex-wrap gap-1 mb-4 border-b border-poe-divider">
      <button
        class="px-3 py-1.5 text-xs uppercase tracking-wide border-b-2 transition-colors
          {tab === 'examples' ? 'border-poe-rare text-poe-rare' : 'border-transparent text-poe-dim hover:text-poe-text'}"
        onclick={() => (tab = 'examples')}
      >
        Examples ({presets.length})
      </button>
      <button
        class="px-3 py-1.5 text-xs uppercase tracking-wide border-b-2 transition-colors
          {tab === 'saved' ? 'border-poe-rare text-poe-rare' : 'border-transparent text-poe-dim hover:text-poe-text'}"
        onclick={() => (tab = 'saved')}
      >
        My saved ({saved.length})
      </button>
      <button
        class="px-3 py-1.5 text-xs uppercase tracking-wide border-b-2 transition-colors
          {tab === 'compare' ? 'border-poe-rare text-poe-rare' : 'border-transparent text-poe-dim hover:text-poe-text'}"
        onclick={() => (tab = 'compare')}
      >
        Compare
      </button>
      <button
        class="px-3 py-1.5 text-xs uppercase tracking-wide border-b-2 transition-colors
          {tab === 'plan' ? 'border-poe-rare text-poe-rare' : 'border-transparent text-poe-dim hover:text-poe-text'}"
        onclick={() => (tab = 'plan')}
      >
        Plan
      </button>
    </div>

    {#if tab === 'examples'}
      <div class="space-y-2">
        {#each presets as preset (preset.id)}
          <button
            class="w-full text-left bg-poe-bg border border-poe-border hover:border-poe-rare/40 rounded p-3 transition-colors group"
            onclick={() => handleLoadPreset(preset.id)}
          >
            <div class="text-sm font-semibold text-poe-text group-hover:text-poe-rare">{preset.name}</div>
            <div class="text-xs text-poe-dim mt-1 leading-snug">{preset.description}</div>
          </button>
        {/each}
      </div>
    {:else if tab === 'saved'}
      <div class="space-y-3">
        <div class="bg-poe-bg border border-poe-border rounded p-3">
          <div class="text-[10px] uppercase tracking-wider text-poe-deepdim mb-2">Save current pair</div>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={saveName}
              placeholder={canSave ? 'Name…' : 'Load two items first'}
              disabled={!canSave}
              onkeydown={(e) => { if (e.key === 'Enter') handleSave(); }}
              class="flex-1 bg-poe-panel border border-poe-divider rounded px-2 py-1.5 text-sm text-poe-text placeholder:text-poe-deepdim focus:outline-none focus:border-poe-rare/40 disabled:opacity-50"
            />
            <button
              class="bg-poe-border hover:bg-[#4d4030] disabled:opacity-50 disabled:cursor-not-allowed text-poe-rare rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
              onclick={handleSave}
              disabled={!canSave || !saveName.trim()}
            >
              Save
            </button>
          </div>
        </div>

        {#if saved.length === 0}
          <div class="text-poe-dim text-sm text-center py-6">
            No saved scenarios yet.
          </div>
        {:else}
          {#each saved as s (s.name)}
            <div class="bg-poe-bg border border-poe-border rounded p-3 flex items-center justify-between gap-2">
              <button
                class="flex-1 text-left group min-w-0"
                onclick={() => handleLoadSaved(s)}
              >
                <div class="text-sm font-semibold text-poe-text group-hover:text-poe-rare truncate">{s.name}</div>
                <div class="text-[11px] text-poe-deepdim mt-0.5 truncate">
                  {s.item1.base} <span class="mx-1">·</span> {s.item2.base}
                </div>
              </button>
              <button
                class="text-poe-deepdim hover:text-poe-corrupted text-lg leading-none px-2 shrink-0"
                onclick={() => onDelete(s.name)}
                aria-label={`Delete ${s.name}`}
                title="Delete"
              >
                ×
              </button>
            </div>
          {/each}
        {/if}
      </div>
    {:else if tab === 'compare'}
      <div class="space-y-3">
        {#if saved.length === 0}
          <div class="text-poe-dim text-sm text-center py-6">
            Save scenarios first, then check them here to compare side by side.
          </div>
        {:else}
          <div class="text-[11px] text-poe-deepdim mb-1">
            Pick scenarios to compare (using cost = <span class="text-poe-text">{costPerTry} div / try</span>):
          </div>
          <div class="space-y-1 mb-3">
            {#each saved as s (s.name)}
              <label class="flex items-center gap-2 text-xs bg-poe-bg border border-poe-divider rounded px-2 py-1.5 cursor-pointer hover:border-poe-rare/40">
                <input type="checkbox" checked={compareSelection.has(s.name)} onchange={() => toggleCompare(s.name)} class="accent-yellow-500" />
                <span class="text-poe-text font-medium truncate">{s.name}</span>
                <span class="text-poe-deepdim truncate ml-auto">{s.item1.base} · {s.item2.base}</span>
              </label>
            {/each}
          </div>

          {#if compareRows.length === 0}
            <div class="text-poe-deepdim text-xs text-center py-4">Pick at least one to see analysis.</div>
          {:else}
            <div class="overflow-x-auto -mx-1 px-1">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-[10px] uppercase tracking-wider text-poe-deepdim border-b border-poe-divider">
                    <th class="text-left py-1.5 pr-2 font-medium">Scenario</th>
                    <th class="text-right py-1.5 px-2 font-medium">Chance</th>
                    <th class="text-right py-1.5 px-2 font-medium">b1 / b2</th>
                    <th class="text-right py-1.5 px-2 font-medium">Exp tries</th>
                    <th class="text-right py-1.5 pl-2 font-medium">Exp cost</th>
                  </tr>
                </thead>
                <tbody>
                  {#each compareRows as r (r.scenario.name)}
                    <tr class="border-b border-poe-divider/50">
                      <td class="py-1.5 pr-2 align-top">
                        <button class="text-poe-text hover:text-poe-rare text-left" onclick={() => { onLoad(r.scenario.item1, r.scenario.item2); onClose(); }}>
                          {r.scenario.name}
                        </button>
                        <div class="text-[10px] text-poe-deepdim">
                          {#if !r.analysis.compatible}<span class="text-poe-corrupted">incompatible</span>{:else}{r.analysis.desiredCount} desired{/if}
                        </div>
                      </td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-rare font-semibold">{pct(r.analysis.chance)}</td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-deepdim">
                        {pct(r.analysis.fromBase1)} <span class="mx-0.5">/</span> {pct(r.analysis.fromBase2)}
                      </td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-text">~{fmtNum(r.analysis.expectedTries)}</td>
                      <td class="text-right py-1.5 pl-2 align-top text-poe-text">~{fmtNum(r.analysis.expectedCost)} div</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      </div>
    {:else if tab === 'plan'}
      <div class="space-y-3">
        {#if saved.length === 0}
          <div class="text-poe-dim text-sm text-center py-6">
            Save scenarios first, then add them here to plan a chain.
          </div>
        {:else}
          <div class="text-[11px] text-poe-deepdim">
            Add saved scenarios as steps. Total cost = sum of <span class="text-poe-text">expected tries × {costPerTry} div</span> across all steps.
          </div>

          <div class="bg-poe-bg border border-poe-border rounded p-2">
            <div class="text-[10px] uppercase tracking-wider text-poe-deepdim mb-1.5">Add a step</div>
            <div class="flex flex-wrap gap-1">
              {#each saved as s (s.name)}
                <button
                  class="text-[11px] text-poe-text hover:text-poe-rare bg-poe-panel border border-poe-divider hover:border-poe-rare/40 rounded px-2 py-1 transition-colors"
                  onclick={() => addToPlan(s.name)}
                  title="Append to plan"
                >
                  + {s.name}
                </button>
              {/each}
            </div>
          </div>

          {#if planRows.length === 0}
            <div class="text-poe-deepdim text-xs text-center py-4">No steps yet — pick from above.</div>
          {:else}
            <div class="overflow-x-auto -mx-1 px-1">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-[10px] uppercase tracking-wider text-poe-deepdim border-b border-poe-divider">
                    <th class="text-left py-1.5 pr-2 font-medium w-8">#</th>
                    <th class="text-left py-1.5 pr-2 font-medium">Step</th>
                    <th class="text-right py-1.5 px-2 font-medium">Chance</th>
                    <th class="text-right py-1.5 px-2 font-medium">Exp tries</th>
                    <th class="text-right py-1.5 px-2 font-medium">Step cost</th>
                    <th class="text-right py-1.5 px-2 font-medium">Cumulative</th>
                    <th class="text-right py-1.5 pl-2 w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {#each planRows as r, i (r.scenario.name + i)}
                    <tr class="border-b border-poe-divider/50">
                      <td class="py-1.5 pr-2 align-top text-poe-deepdim font-mono">{i + 1}</td>
                      <td class="py-1.5 pr-2 align-top">
                        <button class="text-poe-text hover:text-poe-rare text-left" onclick={() => { onLoad(r.scenario.item1, r.scenario.item2); onClose(); }}>
                          {r.scenario.name}
                        </button>
                        <div class="text-[10px] text-poe-deepdim truncate">{r.scenario.item1.base} · {r.scenario.item2.base}</div>
                      </td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-rare font-semibold">{pct(r.analysis.chance)}</td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-text">~{fmtNum(r.analysis.expectedTries)}</td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-text">~{fmtNum(r.analysis.expectedCost)}</td>
                      <td class="text-right py-1.5 px-2 align-top text-poe-text">~{fmtNum(r.cumulative)}</td>
                      <td class="text-right py-1.5 pl-2 align-top whitespace-nowrap">
                        <button class="text-poe-deepdim hover:text-poe-text px-1" onclick={() => movePlanStep(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">↑</button>
                        <button class="text-poe-deepdim hover:text-poe-text px-1" onclick={() => movePlanStep(i, 1)} disabled={i === planRows.length - 1} aria-label="Move down" title="Move down">↓</button>
                        <button class="text-poe-deepdim hover:text-poe-corrupted px-1" onclick={() => removeFromPlan(i)} aria-label="Remove" title="Remove">×</button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="py-2 pr-2 text-right text-[10px] uppercase tracking-wider text-poe-deepdim">Total</td>
                    <td class="text-right py-2 px-2 text-poe-text">~{fmtNum(planTotalTries)}</td>
                    <td class="text-right py-2 px-2 text-poe-rare font-semibold" colspan="2">~{fmtNum(planTotalCost)} div</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>
