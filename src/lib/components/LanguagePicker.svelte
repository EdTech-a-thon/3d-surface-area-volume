<script lang="ts">
  import {
    current,
    language,
    languageOptions,
    setLanguage,
    t,
  } from "$lib/i18n/index.svelte";

  let picker: HTMLLabelElement;

  // Shape Lab can live in a Picture-in-Picture document as well as the main
  // page, so update the document that actually owns this picker.
  $effect(() => {
    if (picker) picker.ownerDocument.documentElement.lang = current().locale;
  });
</script>

<label
  bind:this={picker}
  class="language-picker pointer-events-auto"
  data-testid="language-picker"
>
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
    />
  </svg>
  <select
    data-testid="language-select"
    aria-label={t("language.change")}
    value={language.code}
    onchange={(event) => setLanguage(event.currentTarget.value)}
  >
    {#each languageOptions as option (option.code)}
      <option value={option.code}>{option.name}</option>
    {/each}
  </select>
</label>

<style>
  .language-picker {
    position: relative;
    display: inline-grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    cursor: pointer;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--color-rule) 70%, transparent);
    border-radius: 0.75rem;
    color: var(--color-ink-soft);
    background: color-mix(in srgb, var(--color-panel) 85%, transparent);
    box-shadow: 0 10px 15px -3px rgb(11 26 34 / 0.1);
    backdrop-filter: blur(12px);
    transition:
      color 150ms,
      border-color 150ms;
  }

  .language-picker:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .language-picker:focus-within {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    opacity: 0;
  }
</style>
