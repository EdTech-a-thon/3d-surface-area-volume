<script lang="ts">
  let {
    supported,
    floating,
    onToggle,
  }: {
    supported: boolean;
    floating: boolean;
    onToggle: () => void;
  } = $props();

  const label = $derived(
    floating
      ? "Return Shape Lab to this tab"
      : "Float Shape Lab over other tabs",
  );
</script>

<button
  type="button"
  data-testid="toggle-float"
  class="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-xl border border-rule/70 bg-panel/85 px-2.5 py-2 text-xs font-bold text-ink-soft shadow-lg shadow-ink/10 backdrop-blur-md transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
  disabled={!supported}
  aria-label={supported
    ? label
    : "Floating windows are not supported by this browser"}
  title={supported
    ? label
    : "Floating windows are not supported by this browser"}
  onclick={onToggle}
>
  {#if floating}
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      class="h-4 w-4"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M8 5H4v11h11v-4" />
      <path d="M16 9V4h-5" />
      <path d="m16 4-7 7" />
    </svg>
    <span>Return</span>
  {:else}
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      class="h-4 w-4"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
    >
      <rect x="2.5" y="3.5" width="15" height="12" rx="2" />
      <rect x="9.5" y="8.5" width="6" height="5" rx="1" fill="currentColor" />
    </svg>
    <span>Float</span>
  {/if}
</button>
