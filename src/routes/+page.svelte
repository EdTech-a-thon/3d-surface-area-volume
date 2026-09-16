<script lang="ts">
  import MeasureBar from "$lib/components/MeasureBar.svelte";
  import NetView from "$lib/components/NetView.svelte";
  import RotationControls from "$lib/components/RotationControls.svelte";
  import ShapeBar from "$lib/components/ShapeBar.svelte";
  import SolidView from "$lib/components/SolidView.svelte";
  import TotalsCard from "$lib/components/TotalsCard.svelte";
  import ViewToggle from "$lib/components/ViewToggle.svelte";
  import { UNITS, UNIT_ORDER } from "$lib/domain/format";
  import type { UnitKey } from "$lib/domain/format";
  import { LabState } from "$lib/state/lab.svelte";
  import { onMount } from "svelte";

  const lab = new LabState();

  let reducedMotion = $state(false);
  /** Flipped once the page is live in the browser; nothing responds before that. */
  let ready = $state(false);

  onMount(() => {
    ready = true;
  });

  $effect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotion = motion.matches;
      if (reducedMotion) lab.autoRotate = false;
    };
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
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
    {#if lab.view === "net" && lab.net}
      <NetView {lab} net={lab.net} />
    {:else}
      <SolidView {lab} {reducedMotion} />
    {/if}
  </div>

  <p class="sr-only" aria-live="polite" data-testid="answer-state">
    {lab.answersVisible
      ? "Final answers are visible."
      : "Final answers are hidden."}
  </p>

  <!-- Top left: which solid. Three icons to a row on a phone, where the view
       controls opposite need the rest of the width; one row on a big screen. -->
  <div
    class="pointer-events-none absolute top-2 left-2 z-20 max-w-[9.5rem] sm:max-w-[17.5rem]"
  >
    <ShapeBar {lab} />
  </div>

  <!-- Top right: which view, and what the numbers are called. -->
  <div
    class="pointer-events-none absolute top-2 right-2 z-20 flex flex-wrap justify-end gap-1.5"
  >
    <ViewToggle {lab} />
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
      <RotationControls {lab} {reducedMotion} />
    </div>
    <TotalsCard {lab} />
  </div>
</div>
