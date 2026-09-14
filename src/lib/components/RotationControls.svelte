<script lang="ts">
  import type { LabState } from "$lib/state/lab.svelte";

  let {
    lab,
    reducedMotion = false,
  }: { lab: LabState; reducedMotion?: boolean } = $props();

  const STEP = 0.18;
  const isNet = $derived(lab.view === "net");
  const button =
    "grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-sm text-ink-soft hover:bg-ink/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
</script>

<div
  class="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="group"
  aria-label="Rotate the 3D view"
>
  <button
    type="button"
    class={button}
    data-testid="rotate-left"
    disabled={isNet}
    aria-label="Rotate left"
    onclick={() => lab.rotateBy(-STEP, 0)}>←</button
  >
  <button
    type="button"
    class={button}
    data-testid="rotate-up"
    disabled={isNet}
    aria-label="Tip back"
    onclick={() => lab.rotateBy(0, -STEP)}>↑</button
  >
  <button
    type="button"
    class={button}
    data-testid="rotate-down"
    disabled={isNet}
    aria-label="Tip forward"
    onclick={() => lab.rotateBy(0, STEP)}>↓</button
  >
  <button
    type="button"
    class={button}
    data-testid="rotate-right"
    disabled={isNet}
    aria-label="Rotate right"
    onclick={() => lab.rotateBy(STEP, 0)}>→</button
  >

  <span class="mx-0.5 h-5 w-px bg-rule" aria-hidden="true"></span>

  <button
    type="button"
    class={button}
    data-testid="reset-view"
    disabled={isNet}
    aria-label="Reset the view"
    title="Reset the view"
    onclick={() => lab.resetView()}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  </button>
  <button
    type="button"
    class="{button} {lab.autoRotate
      ? 'bg-accent text-white hover:bg-accent'
      : ''}"
    data-testid="toggle-spin"
    aria-pressed={lab.autoRotate}
    disabled={isNet || reducedMotion}
    aria-label={lab.autoRotate ? "Stop spinning" : "Spin the shape"}
    title={reducedMotion
      ? "Continuous spinning is off because this device asks for reduced motion"
      : lab.autoRotate
        ? "Stop spinning"
        : "Spin the shape"}
    onclick={() => lab.toggleAutoRotate()}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if lab.autoRotate}
        <path d="M9 5v14M15 5v14" />
      {:else}
        <path d="M4 12a8 8 0 1 1 2.5 5.8" />
        <path d="M4 18v-5h5" />
      {/if}
    </svg>
  </button>
</div>
