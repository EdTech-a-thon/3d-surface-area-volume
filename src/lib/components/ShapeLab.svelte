<script lang="ts">
  import BrandChip from "$lib/components/BrandChip.svelte";
  import FloatControl from "$lib/components/FloatControl.svelte";
  import FoldTransition from "$lib/components/FoldTransition.svelte";
  import MeasureBar from "$lib/components/MeasureBar.svelte";
  import NetView from "$lib/components/NetView.svelte";
  import RotationControls from "$lib/components/RotationControls.svelte";
  import ShapeBar from "$lib/components/ShapeBar.svelte";
  import SolidView from "$lib/components/SolidView.svelte";
  import TotalsCard from "$lib/components/TotalsCard.svelte";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
  import { UNITS, UNIT_ORDER } from "$lib/domain/format";
  import type { UnitKey } from "$lib/domain/format";
  import type { SolidKind } from "$lib/domain/types";
  import type { LabState, ViewMode } from "$lib/state/lab.svelte";

  let {
    lab,
    reducedMotion,
    ready,
    floatSupported = false,
    onFloat,
    floatError = null,
    animationWindow,
    floating = false,
  }: {
    lab: LabState;
    reducedMotion: boolean;
    ready: boolean;
    floatSupported?: boolean;
    /**
     * How to send the lab out to a floating window. The copy already floating
     * is given no such handler, and so shows no control: the way back from
     * there is the browser's own back-to-tab button.
     */
    onFloat?: () => void;
    floatError?: string | null;
    animationWindow?: Window;
    /**
     * This copy is the one in the floating window: a small pane where the shape
     * has to keep the room. The controls fold down to their smallest useful
     * form, and everything that is not one — the maker's mark — steps aside.
     */
    floating?: boolean;
  } = $props();

  // A fold belongs to the drawing that is playing it, so it is held here rather
  // than in the lab: the window showing the shape is the one folding it.
  /** Which way the sheet is moving while a fold is running, if one is. */
  let folding = $state<"open" | "close" | null>(null);
  /** Which solid the running fold belongs to; only read while one is running. */
  let foldingKind = $state<SolidKind | null>(null);

  function changeView(view: ViewMode) {
    if (view === lab.view || reducedMotion || !lab.net) {
      folding = null;
      lab.setView(view);
      return;
    }
    // Switch the view straight away — the tab, the spin button and the reading
    // panels all belong to where we are going. Only the drawing lags behind,
    // folding from the one to the other.
    const way = view === "net" ? "open" : "close";
    lab.setView(view);
    foldingKind = lab.kind;
    folding = way;
  }

  function finishFolding() {
    folding = null;
  }

  $effect(() => {
    // Picking another solid mid-fold should never leave the old one's faces
    // over the new drawing.
    if (folding && lab.kind !== foldingKind) folding = null;
  });

  $effect(() => {
    if (reducedMotion) folding = null;
  });
</script>

<!-- The shape owns the screen. Everything else is a small panel floating over
     it at a corner, so nothing competes with the solid for attention. -->
<div
  class="relative h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-paper to-accent-soft/50"
  data-ready={ready ? "true" : undefined}
>
  <h1 class="sr-only">Shape Lab</h1>

  <div class="absolute inset-0">
    {#if folding && lab.net}
      <!-- While the sheet is moving it is the whole drawing: it starts where the
           view it came from left off and lands exactly where the view taking
           over will draw it. Inert, since it is only a picture of the change. -->
      <div class="pointer-events-none absolute inset-0" inert>
        <FoldTransition
          {lab}
          net={lab.net}
          direction={folding}
          onComplete={finishFolding}
          {animationWindow}
        />
      </div>
    {:else if lab.view === "net" && lab.net}
      <NetView {lab} net={lab.net} compact={floating} />
    {:else}
      <SolidView {lab} {reducedMotion} {animationWindow} compact={floating} />
    {/if}
  </div>

  <p class="sr-only" aria-live="polite" data-testid="answer-state">
    {lab.answersVisible
      ? "Final answers are visible."
      : "Final answers are hidden."}
  </p>

  <!-- Top left: who made this, then which solid. The mark leads the row the way
       a masthead leads a page, and the picker keeps the width it had: three
       icons to a row on a phone, where the view controls opposite need the rest
       of the width; one row on a big screen. -->
  <div
    class="pointer-events-none absolute top-2 left-2 z-20 flex items-start gap-1.5"
  >
    {#if !floating}
      <BrandChip {lab} />
    {/if}
    <div class={floating ? "" : "max-w-[9.5rem] sm:max-w-[20rem]"}>
      <ShapeBar {lab} compact={floating} />
    </div>
  </div>

  <!-- Top right: which view, what the numbers are called, and whether the lab
       floats over other tabs. The row wraps in a small floating window. -->
  <div
    class="pointer-events-none absolute top-2 right-2 z-20 flex max-w-[16rem] flex-wrap justify-end gap-1.5 sm:max-w-none"
  >
    {#if onFloat}
      <FloatControl supported={floatSupported} onToggle={onFloat} />
    {/if}
    <ViewToggle {lab} onViewChange={changeView} />
    <label class="sr-only" for="unit-select">Units</label>
    <select
      id="unit-select"
      data-testid="unit-select"
      class="pointer-events-auto cursor-pointer rounded-xl border border-rule/70 bg-panel/85 px-2 py-1 text-xs font-bold shadow-lg shadow-ink/10 backdrop-blur-md"
      value={lab.unit}
      onchange={(event) => (lab.unit = event.currentTarget.value as UnitKey)}
    >
      {#each UNIT_ORDER as key (key)}
        <option value={key}>{UNITS[key].linear}</option>
      {/each}
    </select>
  </div>

  {#if floatError}
    <p
      role="alert"
      class="absolute top-16 right-2 z-30 max-w-72 rounded-lg border border-flag/40 bg-flag-soft/95 px-3 py-2 text-xs font-semibold text-ink shadow-lg"
    >
      Could not open the floating window: {floatError}
    </p>
  {/if}

  <!-- Bottom: the dimensions on the left, the answers on the right, and the
       view controls between them. The view controls are centred on the screen
       rather than on the gap, so they stay put as the panels either side change
       width. On a phone they drop to their own row underneath. -->
  <div
    class="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex flex-wrap items-end justify-between gap-2"
  >
    <MeasureBar {lab} />
    <div
      class="order-last flex w-full justify-center sm:absolute sm:bottom-0 sm:left-1/2 sm:order-none sm:w-auto sm:-translate-x-1/2"
    >
      <RotationControls {lab} {reducedMotion} compact={floating} />
    </div>
    <TotalsCard {lab} compact={floating} />
  </div>
</div>
