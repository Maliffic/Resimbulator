<script lang="ts">
  import type { Item, Mod } from '$lib/recombinator/index.js';
  import type { ModDb, ModDef, BaseDef } from '$lib/mods/index.js';
  import { defToMod, isEligibleForBase } from '$lib/ui/generate.js';

  type Props = {
    item: Item;
    affix: 'prefix' | 'suffix';
    modDb: ModDb;
    onClose: () => void;
    onAdd: (mod: Mod) => void;
  };

  let { item, affix, modDb, onClose, onAdd }: Props = $props();

  let search = $state('');
  let restrictedOnly = $state(false);

  const baseCtx = $derived<BaseDef>({
    name: item.base,
    itemClass: item.itemClass,
    attributeBase: item.attributeBase,
    defenceTags: item.defenceTags,
  });

  const eligibleEntries = $derived.by(() => {
    const out: ModDef[] = [];
    for (const def of modDb.byId.values()) {
      if (def.affix !== affix) continue;
      if (!isEligibleForBase(def, baseCtx, item.influence)) continue;
      out.push(def);
    }
    return out;
  });

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    let pool = eligibleEntries;
    if (restrictedOnly) {
      pool = pool.filter(
        (d) => d.defenceRestriction || d.attributeRestriction || d.influenceRestriction
          || d.domain === 'crafted' || d.domain === 'delve' || d.domain === 'breach' || d.domain === 'incursion',
      );
    }
    if (q) {
      pool = pool.filter(
        (d) => d.name.toLowerCase().includes(q)
          || d.statTemplates.some((t) => t.toLowerCase().includes(q)),
      );
    }
    // De-duplicate by name (the DB has many tier variants per name).
    const seen = new Set<string>();
    const result: ModDef[] = [];
    for (const def of pool) {
      const key = `${def.name}|${def.domain}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(def);
      if (result.length >= 60) break;
    }
    return result;
  });

  function categoryLabel(def: ModDef): string {
    if (def.domain === 'crafted') return 'Crafted';
    if (def.domain === 'breach') return 'Breach';
    if (def.domain === 'incursion') return 'Incursion';
    if (def.domain === 'delve') return 'Delve';
    if (def.tier === null && def.domain === 'item') return 'Essence';
    if (def.influenceRestriction) return `NNN: ${def.influenceRestriction}`;
    if (def.defenceRestriction && def.defenceRestriction.length > 0) return `NNN: ${def.defenceRestriction.join('+')}`;
    if (def.attributeRestriction && def.attributeRestriction.length > 0) return `NNN: ${def.attributeRestriction.join('/')}`;
    return 'Regular';
  }

  function handleAdd(def: ModDef) {
    const mod = defToMod(def);
    onAdd(mod);
    onClose();
  }
</script>

<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1">
  <div class="bg-poe-panel border border-poe-border rounded-md p-5 max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl shadow-black/60"
    onclick={(e) => e.stopPropagation()}
    role="presentation">
    <div class="flex items-baseline justify-between border-b border-poe-border pb-2 mb-3">
      <div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-poe-deepdim">Add {affix}</div>
        <div class="text-sm text-poe-text">{item.base} <span class="text-poe-deepdim">·</span> <span class="text-poe-deepdim">{eligibleEntries.length} eligible</span></div>
      </div>
      <button class="text-poe-deepdim hover:text-poe-text text-xl leading-none" onclick={onClose} aria-label="close">×</button>
    </div>

    <div class="flex gap-2 mb-3">
      <input
        type="text"
        bind:value={search}
        placeholder="Search by name or stat…"

        class="flex-1 bg-poe-bg border border-poe-divider rounded px-2 py-1.5 text-sm text-poe-text placeholder:text-poe-deepdim focus:outline-none focus:border-poe-rare/40"
      />
      <label class="flex items-center gap-1.5 text-xs text-poe-dim cursor-pointer select-none whitespace-nowrap">
        <input type="checkbox" bind:checked={restrictedOnly} class="accent-yellow-500" />
        Restricted
      </label>
    </div>

    <div class="flex-1 overflow-y-auto space-y-0.5">
      {#each filtered as def (def.id)}
        <button
          class="w-full text-left bg-poe-bg hover:bg-poe-border/40 border border-poe-divider hover:border-poe-rare/40 rounded px-2 py-1.5 transition-colors flex items-start gap-2"
          onclick={() => handleAdd(def)}
        >
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-chip-regular text-poe-text/90 shrink-0 mt-0.5 font-medium tracking-wide">
            {categoryLabel(def)}
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] italic text-poe-deepdim leading-tight">{def.name}{def.tier !== null ? ` · T${def.tier}` : ''}</div>
            <div class="text-xs text-poe-text leading-snug truncate">{def.statTemplates[0] ?? ''}</div>
          </div>
        </button>
      {/each}
      {#if filtered.length === 0}
        <div class="text-poe-dim text-sm text-center py-8">No matches.</div>
      {/if}
    </div>
  </div>
</div>
