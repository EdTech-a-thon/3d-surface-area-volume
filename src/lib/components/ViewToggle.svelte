<script lang="ts">
  import type { LabState, ViewMode } from "$lib/state/lab.svelte";

  let {
    lab,
    onViewChange = (view) => lab.setView(view),
  }: { lab: LabState; onViewChange?: (view: ViewMode) => void } = $props();

  const isNet = $derived(lab.view === "net");
  const tab =
    "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide uppercase transition disabled:cursor-not-allowed disabled:opacity-40";

  /** Whether the pointer is on the Net tab, which is where the sphere's excuse lives. */
  let asking = $state(false);
</script>

<div
  class="pointer-events-auto flex rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="radiogroup"
  aria-label="View"
>
  <button
    type="button"
    role="radio"
    aria-checked={!isNet}
    data-testid="view-solid"
    class="{tab} {!isNet ? 'bg-accent text-white' : 'text-ink-soft'}"
    onclick={() => onViewChange("solid")}>Solid</button
  >
  <!-- A disabled button dispatches no pointer events of its own, so the reason
       the Net tab is greyed out has to be hung on something around it. The
       wrapper is scaffolding: the tab inside it keeps the radio role. -->
  <span
    role="presentation"
    class="relative flex"
    onpointerenter={() => (asking = true)}
    onpointerleave={() => (asking = false)}
  >
    <button
      type="button"
      role="radio"
      aria-checked={isNet}
      data-testid="view-net"
      class="{tab} {isNet ? 'bg-accent text-white' : 'text-ink-soft'}"
      disabled={!lab.definition.hasNet}
      aria-describedby={lab.definition.hasNet ? undefined : "no-net-reason"}
      onclick={() => onViewChange("net")}>Net</button
    >
    {#if !lab.definition.hasNet}
      <!-- Always in the document, so the tab keeps something to point its
           aria-describedby at; only laid out on screen when it is asked for. -->
      <p
        id="no-net-reason"
        data-testid="no-net-reason"
        class={asking
          ? "absolute top-full right-0 z-30 mt-2 w-60 rounded-lg border border-rule/70 bg-panel/95 px-3 py-1.5 text-center text-xs font-normal normal-case shadow-lg shadow-ink/10 backdrop-blur-md"
          : "sr-only"}
      >
        A sphere has <strong>no flat net</strong>: its surface cannot be
        flattened without stretching, which is why world maps distort countries.
      </p>
    {/if}
  </span>
</div>
