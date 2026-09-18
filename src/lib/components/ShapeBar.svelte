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
</script>

{#if compact}
  <label class="sr-only" for="shape-select">{t("shape.label")}</label>
  <select
    id="shape-select"
    data-testid="shape-select"
    class="pointer-events-auto max-w-[9.5rem] cursor-pointer rounded-xl border border-rule/70 bg-panel/85 px-2 py-1 text-xs font-bold shadow-lg shadow-ink/10 backdrop-blur-md"
    value={lab.kind}
    onchange={(event) => lab.selectKind(event.currentTarget.value as SolidKind)}
  >
    {#each kinds as kind (kind)}
      <option value={kind}>{domainText(SOLIDS[kind].name)}</option>
    {/each}
  </select>
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
