<script lang="ts">
  import { asset, resolve } from "$app/paths";
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  /**
   * The footer, folded up — and the way in to the joke.
   *
   * The lab fills the viewport and its four corners are already spoken for, so
   * there is no strip of page left to stand a footer in. Instead the mark sits
   * at the head of the shape picker, in a panel of its own so it reads as a
   * credit rather than a seventh solid, and drops what a footer would have said
   * the way the Net tab drops its reason for being greyed out.
   *
   * Clicking it puts the logo on the stage as a solid. It is not in the picker
   * because it is not really one of the six: it is the mark itself, and finding
   * it should feel like finding something.
   */
  let { lab }: { lab: LabState } = $props();

  /** Pointing at it is enough on a desktop; nothing has to be clicked. */
  let hovering = $state(false);
  /** Anything inside has keyboard focus, so tabbing through opens it too. */
  let focused = $state(false);
  /** Left open by a click, which is what a touch screen has instead of a hover. */
  let pinned = $state(false);

  const open = $derived(hovering || focused || pinned);
  const showing = $derived(lab.kind === "logoSlab");
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") pinned = false;
  }}
/>

<div
  role="presentation"
  class="pointer-events-auto relative"
  onpointerenter={() => (hovering = true)}
  onpointerleave={() => (hovering = false)}
  onfocusin={() => (focused = true)}
  onfocusout={() => {
    focused = false;
    pinned = false;
  }}
>
  <!-- Its own panel, sized exactly like the picker beside it: the same box, set
       apart rather than made smaller. -->
  <div
    class="rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  >
    <button
      type="button"
      data-testid="brand-toggle"
      aria-expanded={open}
      aria-controls="brand-panel"
      aria-pressed={showing}
      aria-label={t("brand.action")}
      title={t("brand.title")}
      class="grid h-10 w-10 cursor-pointer place-items-center rounded-lg transition {showing
        ? 'bg-accent-soft ring-2 ring-accent'
        : 'hover:bg-ink/5'}"
      onclick={() => {
        lab.selectKind("logoSlab");
        pinned = !pinned;
      }}
    >
      <img
        src={asset("/edtechathon-logo.svg")}
        alt=""
        class="h-[26px] w-[26px]"
      />
    </button>
  </div>

  <!-- Always in the document, so the button keeps something to point its
       aria-controls at and the links stay reachable by keyboard; only laid out
       on screen once it is asked for.

       The gap under the chip is padding on this wrapper, not a margin on the
       card, so the pointer crosses it without ever leaving the chip. A margin
       would leave dead page in between, and a slow hand travelling over it
       would close the very thing it was reaching for. -->
  <div
    id="brand-panel"
    data-testid="brand-panel"
    class={open ? "absolute top-full left-0 z-30 pt-2" : "sr-only"}
  >
    <div
      class="flex w-max flex-col items-start gap-1 rounded-xl border border-rule/70 bg-panel/95 px-3 py-2 shadow-lg shadow-ink/10 backdrop-blur-md"
    >
      <a
        href="https://teacher.dev"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm font-bold text-ink transition hover:text-accent"
        >{t("common.builtBy")}</a
      >
      <p class="flex items-center gap-2 text-xs font-bold text-ink-soft">
        <a
          href={resolve("/about")}
          data-testid="brand-about"
          class="transition hover:text-accent">{t("common.about")}</a
        >
        <span aria-hidden="true" class="text-rule">·</span>
        <a
          href={resolve("/privacy")}
          data-testid="brand-privacy"
          class="transition hover:text-accent">{t("common.privacy")}</a
        >
      </p>
    </div>
  </div>
</div>
