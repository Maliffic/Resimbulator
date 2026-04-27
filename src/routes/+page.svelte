<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createEmptyState, setItem, toggleDesired, reset, computeChance, computeChanceByBase, allDesiredMods,
  } from '$lib/ui/state.js';
  import type { AppState } from '$lib/ui/state.js';
  import { getModDb } from '$lib/ui/mod-db-fetch.js';
  import { saveState, loadState } from '$lib/ui/persist.js';
  import { encodeStateToUrl, decodeStateFromUrl } from '$lib/ui/url-state.js';
  import type { ModDb } from '$lib/mods/index.js';
  import TopBar from '../components/TopBar.svelte';
  import ItemPanel from '../components/ItemPanel.svelte';
  import StatsPanel from '../components/StatsPanel.svelte';
  import HelpDialog from '../components/HelpDialog.svelte';

  let modDb = $state<ModDb | null>(null);
  let appState = $state<AppState>(createEmptyState());
  let loadError = $state<string | null>(null);
  let initialized = $state(false);
  let helpOpen = $state(false);

  onMount(async () => {
    try {
      modDb = await getModDb();

      // Resolve initial state: URL > localStorage > empty
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('s');
      if (shared) {
        try {
          const decoded = decodeStateFromUrl(shared);
          if (decoded.item1) setItem(appState, 1, decoded.item1);
          if (decoded.item2) setItem(appState, 2, decoded.item2);
          history.replaceState({}, '', window.location.pathname);
        } catch {
          loadError = 'Failed to decode shared state';
        }
      } else {
        const persisted = loadState(window.localStorage);
        if (persisted.item1) setItem(appState, 1, persisted.item1);
        if (persisted.item2) setItem(appState, 2, persisted.item2);
      }

      initialized = true;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load mod database';
    }
  });

  // Auto-save on every change
  $effect(() => {
    if (!initialized) return;
    saveState({ item1: appState.item1, item2: appState.item2 }, window.localStorage);
  });

  const chanceByBase = $derived(computeChanceByBase(appState));
  const chance = $derived(chanceByBase.weighted);
  const desiredCount = $derived(allDesiredMods(appState).length);

  function handleShare() {
    const encoded = encodeStateToUrl({ item1: appState.item1, item2: appState.item2 });
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  function handleReset() {
    if (confirm('Clear both items?')) reset(appState);
  }
</script>

<TopBar onShare={handleShare} onReset={handleReset} onHelp={() => (helpOpen = true)} />

{#if helpOpen}
  <HelpDialog onClose={() => (helpOpen = false)} />
{/if}

<main class="p-6">
  {#if loadError}
    <div class="bg-red-900/30 border border-red-800 rounded p-4 text-red-200">
      {loadError}
    </div>
  {:else if !modDb}
    <div class="text-center text-gray-500 py-20">Loading mod database...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,400px)_1fr] gap-4 max-w-7xl mx-auto">
      <ItemPanel
        item={appState.item1}
        modDb={modDb}
        label="Item 1"
        onItemChange={(it) => setItem(appState, 1, it)}
        onToggleDesired={(modId) => {
          if (appState.item1) toggleDesired(appState, appState.item1.id, modId);
        }}
      />
      <StatsPanel
        item1={appState.item1}
        item2={appState.item2}
        chance={chance}
        chanceFromItem1={chanceByBase.fromItem1}
        chanceFromItem2={chanceByBase.fromItem2}
        desiredCount={desiredCount}
        batchTrials={appState.settings.batchSimTrials}
      />
      <ItemPanel
        item={appState.item2}
        modDb={modDb}
        label="Item 2"
        onItemChange={(it) => setItem(appState, 2, it)}
        onToggleDesired={(modId) => {
          if (appState.item2) toggleDesired(appState, appState.item2.id, modId);
        }}
      />
    </div>
  {/if}
</main>
