<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createEmptyState, setItem, toggleDesired, reset, computeChance, computeChanceByBase, allDesiredMods,
    addMod, removeMod,
  } from '$lib/ui/state.js';
  import type { AppState } from '$lib/ui/state.js';
  import { getModDb } from '$lib/ui/mod-db-fetch.js';
  import { saveState, loadState, loadScenarios, saveScenarios, loadWorkflow, saveWorkflow } from '$lib/ui/persist.js';
  import type { SavedScenario, WorkflowStage } from '$lib/ui/persist.js';
  import { encodeStateToUrl, decodeStateFromUrl } from '$lib/ui/url-state.js';
  import { generateRandomPair } from '$lib/ui/generate.js';
  import type { ModDb } from '$lib/mods/index.js';
  import type { Item } from '$lib/recombinator/index.js';
  import TopBar from '../components/TopBar.svelte';
  import ItemPanel from '../components/ItemPanel.svelte';
  import StatsPanel from '../components/StatsPanel.svelte';
  import HelpDialog from '../components/HelpDialog.svelte';
  import LibraryDialog from '../components/LibraryDialog.svelte';

  let modDb = $state<ModDb | null>(null);
  let appState = $state<AppState>(createEmptyState());
  let loadError = $state<string | null>(null);
  let initialized = $state(false);
  let helpOpen = $state(false);
  let libraryOpen = $state(false);
  let savedScenarios = $state<SavedScenario[]>([]);
  let workflow = $state<WorkflowStage[]>([]);

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
        if (typeof persisted.costPerTry === 'number') appState.settings.costPerTry = persisted.costPerTry;
      }
      savedScenarios = loadScenarios(window.localStorage);
      workflow = loadWorkflow(window.localStorage);

      initialized = true;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load mod database';
    }
  });

  // Auto-save on every change
  $effect(() => {
    if (!initialized) return;
    saveState({
      item1: appState.item1,
      item2: appState.item2,
      costPerTry: appState.settings.costPerTry,
    }, window.localStorage);
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

  function handleGenerate() {
    if (!modDb) return;
    const { item1, item2 } = generateRandomPair(modDb);
    setItem(appState, 1, item1);
    setItem(appState, 2, item2);
  }

  function handleLoadPair(it1: Item, it2: Item) {
    setItem(appState, 1, it1);
    setItem(appState, 2, it2);
  }

  function handleSaveScenario(name: string) {
    if (!appState.item1 || !appState.item2) return;
    const next = savedScenarios.filter((s) => s.name !== name);
    next.push({ name, savedAt: Date.now(), item1: appState.item1, item2: appState.item2 });
    next.sort((a, b) => b.savedAt - a.savedAt);
    savedScenarios = next;
    saveScenarios(next, window.localStorage);
  }

  function handleDeleteScenario(name: string) {
    const next = savedScenarios.filter((s) => s.name !== name);
    savedScenarios = next;
    saveScenarios(next, window.localStorage);
  }

  function handleCostChange(n: number) {
    appState.settings.costPerTry = Math.max(0, n);
  }

  function handleWorkflowChange(stages: WorkflowStage[]) {
    workflow = stages;
    saveWorkflow(stages, window.localStorage);
  }
</script>

<TopBar
  onShare={handleShare}
  onReset={handleReset}
  onHelp={() => (helpOpen = true)}
  onGenerate={handleGenerate}
  onLibrary={() => (libraryOpen = true)}
/>

{#if helpOpen}
  <HelpDialog onClose={() => (helpOpen = false)} />
{/if}

{#if libraryOpen}
  <LibraryDialog
    item1={appState.item1}
    item2={appState.item2}
    saved={savedScenarios}
    workflow={workflow}
    costPerTry={appState.settings.costPerTry}
    onClose={() => (libraryOpen = false)}
    onLoad={handleLoadPair}
    onSave={handleSaveScenario}
    onDelete={handleDeleteScenario}
    onWorkflowChange={handleWorkflowChange}
  />
{/if}

<main class="p-3 sm:p-6">
  {#if loadError}
    <div class="bg-red-900/30 border border-red-800 rounded p-4 text-red-200">
      {loadError}
    </div>
  {:else if !modDb}
    <div class="text-center text-gray-500 py-20">Loading mod database...</div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,400px)_1fr] gap-3 sm:gap-4 max-w-7xl mx-auto">
      <ItemPanel
        item={appState.item1}
        modDb={modDb}
        label="Item 1"
        onItemChange={(it) => setItem(appState, 1, it)}
        onToggleDesired={(modId) => {
          if (appState.item1) toggleDesired(appState, appState.item1.id, modId);
        }}
        onDeleteMod={(modId) => {
          if (appState.item1) removeMod(appState, appState.item1.id, modId);
        }}
        onAddMod={(mod) => {
          if (appState.item1) addMod(appState, appState.item1.id, mod);
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
        costPerTry={appState.settings.costPerTry}
        onGenerate={handleGenerate}
        onCostChange={handleCostChange}
      />
      <ItemPanel
        item={appState.item2}
        modDb={modDb}
        label="Item 2"
        onItemChange={(it) => setItem(appState, 2, it)}
        onToggleDesired={(modId) => {
          if (appState.item2) toggleDesired(appState, appState.item2.id, modId);
        }}
        onDeleteMod={(modId) => {
          if (appState.item2) removeMod(appState, appState.item2.id, modId);
        }}
        onAddMod={(mod) => {
          if (appState.item2) addMod(appState, appState.item2.id, mod);
        }}
      />
    </div>
  {/if}
</main>
