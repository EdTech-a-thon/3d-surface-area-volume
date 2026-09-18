<script lang="ts">
  import { asset, resolve } from "$app/paths";
  import type { Snippet } from "svelte";

  /**
   * The frame the two prose pages share. These are ordinary scrolling pages
   * rather than the full-viewport lab, so here a footer really can sit at the
   * bottom; the lab uses `BrandChip` in its place.
   */
  let {
    title,
    lede,
    children,
  }: { title: string; lede: string; children: Snippet } = $props();
</script>

<div
  class="flex min-h-[100dvh] flex-col bg-gradient-to-b from-paper to-accent-soft/50"
>
  <header class="border-b border-rule/70 bg-panel/70 backdrop-blur-md">
    <div
      class="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3"
    >
      <a
        href={resolve("/")}
        class="flex items-center gap-2 text-lg font-bold tracking-tight transition hover:text-accent"
      >
        <img src={asset("/edtechathon-logo.svg")} alt="" class="h-7 w-7" />
        Shape Lab
      </a>
      <a
        href={resolve("/")}
        data-testid="back-to-lab"
        class="rounded-lg px-2 py-1 text-sm font-bold text-ink-soft transition hover:text-accent"
        >← Back to the lab</a
      >
    </div>
  </header>

  <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
    <h1 class="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
    <p class="mb-8 text-ink-soft">{lede}</p>
    {@render children()}
  </main>

  <footer
    class="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-6 text-center text-sm text-ink-soft"
  >
    <a
      href="https://teacher.dev"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 transition hover:text-accent"
    >
      <img src={asset("/edtechathon-logo.svg")} alt="" class="h-6 w-6" />
      Built by teacher.dev
    </a>
    <a href={resolve("/about")} class="transition hover:text-accent">about</a>
    <a href={resolve("/privacy")} class="transition hover:text-accent"
      >privacy</a
    >
  </footer>
</div>
