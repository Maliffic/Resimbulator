<script lang="ts">
  import type { Item } from '$lib/recombinator/index.js';
  import type { SavedScenario } from '$lib/ui/persist.js';
  import { listPresets } from '$lib/ui/presets.js';

  type Props = {
    item1: Item | null;
    item2: Item | null;
    saved: SavedScenario[];
    onClose: () => void;
    onLoad: (item1: Item, item2: Item) => void;
    onSave: (name: string) => void;
    onDelete: (name: string) => void;
  };

  let { item1, item2, saved, onClose, onLoad, onSave, onDelete }: Props = $props();

  let tab = $state<'examples' | 'saved'>('examples');
  let saveName = $state('');

  const presets = listPresets();
  const canSave = $derived(item1 !== null && item2 !== null);

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

    <div class="flex gap-1 mb-4 border-b border-poe-divider">
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
    {:else}
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
    {/if}
  </div>
</div>
