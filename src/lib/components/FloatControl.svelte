<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";

  /**
   * Sends the lab out into a floating window. There is no control here for
   * coming back: the floating window carries the browser's own back-to-tab
   * button, which returns the viewer to the tab as well as the lab.
   */
  let {
    supported,
    onToggle,
  }: {
    supported: boolean;
    onToggle: () => void;
  } = $props();

  const label = $derived(supported ? t("float.open") : t("float.unsupported"));
</script>

<button
  type="button"
  data-testid="toggle-float"
  class="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-xl border border-rule/70 bg-panel/85 px-2.5 py-2 text-xs font-bold text-ink-soft shadow-lg shadow-ink/10 backdrop-blur-md transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
  disabled={!supported}
  aria-label={label}
  title={label}
  onclick={onToggle}
>
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
  <span>{t("float.button")}</span>
</button>
