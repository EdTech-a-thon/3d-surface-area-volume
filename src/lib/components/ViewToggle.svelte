<script lang="ts">
  import type { LabState } from "$lib/state/lab.svelte";

  let { lab }: { lab: LabState } = $props();

  const isNet = $derived(lab.view === "net");
  const tab =
    "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide uppercase transition disabled:cursor-not-allowed disabled:opacity-40";
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
    onclick={() => lab.setView("solid")}>Solid</button
  >
  <button
    type="button"
    role="radio"
    aria-checked={isNet}
    data-testid="view-net"
    class="{tab} {isNet ? 'bg-accent text-white' : 'text-ink-soft'}"
    disabled={!lab.definition.hasNet}
    aria-describedby={lab.definition.hasNet ? undefined : "no-net-reason"}
    onclick={() => lab.setView("net")}>Net</button
  >
</div>
