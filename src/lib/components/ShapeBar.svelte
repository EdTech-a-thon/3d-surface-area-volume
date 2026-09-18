<script lang="ts">
  import { SOLIDS } from "$lib/domain/solids";
  import { SOLID_ORDER } from "$lib/domain/types";
  import type { SolidKind } from "$lib/domain/types";
  import { domainText, t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";
  import ShapeIcon from "./ShapeIcon.svelte";

  let {
    lab,
    compact = false,
  }: {
    lab: LabState;
    /**
     * Fold the row of icons down to a single dropdown. A floating window is
     * mostly shape, so six buttons across its top edge would cost more room
     * than they are worth.
     */
    compact?: boolean;
  } = $props();

  /**
   * The logo is not one of the solids on offer, but it can be on the stage when
   * the lab floats. The dropdown has to be able to show what is showing, so it
   * carries the logo only while the logo is what is selected.
   */
  const kinds = $derived(
    lab.kind === "logoSlab"
      ? ([...SOLID_ORDER, "logoSlab"] as const satisfies readonly SolidKind[])
      : SOLID_ORDER,
  );

  let open = $state(false);
  let picker = $state<HTMLDivElement | undefined>();

  function choose(kind: SolidKind) {
    lab.selectKind(kind);
    open = false;
  }

  /**
   * A press anywhere else puts the list away. The listener belongs to the
   * document this picker is actually in, which is not the page's own document
   * when the lab is floating.
   */
  $effect(() => {
    if (!open || !picker) return;
    const owner = picker.ownerDocument;
    const close = (event: Event) => {
      if (!picker?.contains(event.target as Node)) open = false;
    };
    owner.addEventListener("pointerdown", close, true);
    return () => owner.removeEventListener("pointerdown", close, true);
  });
</script>

{#if compact}
  <!-- The same icons, behind one of them. A floating window has room for a
       single button along its top edge, so the picker shows what is on the
       stage and opens the rest underneath. Names would say no more than the
       drawings do, and cost the width the shape wants. -->
  <div
    role="presentation"
    class="pointer-events-auto relative"
    bind:this={picker}
    onkeydown={(event) => {
      if (event.key === "Escape" && open) {
        open = false;
        event.stopPropagation();
      }
    }}
  >
    <button
      type="button"
      data-testid="shape-picker"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label="{t('shape.label')}: {domainText(SOLIDS[lab.kind].name)}"
      title={domainText(SOLIDS[lab.kind].name)}
      class="flex h-10 cursor-pointer items-center gap-0.5 rounded-xl border border-rule/70 bg-panel/85 pr-1 pl-1.5 text-ink-soft shadow-lg shadow-ink/10 backdrop-blur-md transition hover:text-accent"
      onclick={() => (open = !open)}
    >
      <ShapeIcon kind={lab.kind} size={26} />
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    {#if open}
      <div
        role="listbox"
        aria-label={t("shape.label")}
        data-testid="shape-list"
        class="absolute top-full left-0 z-30 mt-1.5 grid w-max grid-cols-3 gap-0.5 rounded-xl border border-rule/70 bg-panel/95 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
      >
        {#each kinds as kind (kind)}
          {@const definition = SOLIDS[kind]}
          {@const chosen = lab.kind === kind}
          <button
            type="button"
            role="option"
            aria-selected={chosen}
            aria-label={domainText(definition.name)}
            title={domainText(definition.name)}
            data-testid="shape-{kind}"
            class="grid h-10 w-10 cursor-pointer place-items-center rounded-lg transition {chosen
              ? 'bg-accent text-white'
              : 'text-ink-soft hover:bg-ink/5 hover:text-accent'}"
            onclick={() => choose(kind)}
          >
            <ShapeIcon {kind} size={26} />
          </button>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <!-- Icons only: the shape on the stage says which solid this is, so the names
       would only repeat it. Each button still carries its name for assistive
       technology and as a tooltip. -->
  <div
    class="pointer-events-auto flex flex-wrap gap-0.5 rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
    role="radiogroup"
    aria-label={t("shape.label")}
  >
    {#each SOLID_ORDER as kind (kind)}
      {@const definition = SOLIDS[kind]}
      {@const chosen = lab.kind === kind}
      <button
        type="button"
        role="radio"
        aria-checked={chosen}
        aria-label={domainText(definition.name)}
        title={domainText(definition.name)}
        data-testid="shape-{kind}"
        class="grid h-10 w-10 cursor-pointer place-items-center rounded-lg transition {chosen
          ? 'bg-accent text-white'
          : 'text-ink-soft hover:bg-ink/5 hover:text-accent'}"
        onclick={() => lab.selectKind(kind)}
      >
        <ShapeIcon {kind} size={26} />
      </button>
    {/each}
  </div>
{/if}
