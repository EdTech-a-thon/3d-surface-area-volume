<script lang="ts">
  import ShapeLab from "$lib/components/ShapeLab.svelte";
  import { LabState } from "$lib/state/lab.svelte";
  import {
    copyStyles,
    documentPictureInPicture,
  } from "$lib/ui/documentPictureInPicture";
  import { mount, onMount, tick, unmount } from "svelte";

  const lab = new LabState();

  let reducedMotion = $state(false);
  /** Flipped once the page is live in the browser; nothing responds before that. */
  let ready = $state(false);
  let floatSupported = $state(false);
  let floatingWindow = $state<Window | null>(null);
  let floatingApp: ReturnType<typeof mount> | null = null;
  let floatError = $state<string | null>(null);

  onMount(() => {
    ready = true;
    floatSupported = documentPictureInPicture(window) !== null;

    return () => {
      if (floatingApp) void unmount(floatingApp);
      floatingWindow?.close();
    };
  });

  $effect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotion = motion.matches;
      if (reducedMotion) lab.autoRotate = false;
    };
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  });

  async function removeFloatingApp() {
    if (!floatingApp) return;
    const app = floatingApp;
    floatingApp = null;
    await unmount(app);
  }

  async function restoreToTab() {
    await removeFloatingApp();
    floatingWindow = null;
  }

  async function closeFloatingWindow() {
    const current = floatingWindow;
    await restoreToTab();
    current?.close();
  }

  async function openFloatingWindow() {
    const controller = documentPictureInPicture(window);
    if (!controller) return;

    let pip: Window | null = null;
    floatError = null;
    try {
      pip = await controller.requestWindow({
        width: 600,
        height: 600,
        preferInitialWindowPlacement: false,
      });
      pip.document.title = "Shape Lab";
      copyStyles(document, pip.document);
      pip.addEventListener(
        "pagehide",
        () => {
          void restoreToTab();
        },
        { once: true },
      );

      // Remove the copy in the tab before mounting into the new document. A new
      // Svelte root is important here: delegated events belong to the document
      // where a component was mounted and would not survive moving the old DOM.
      floatingWindow = pip;
      await tick();
      floatingApp = mount(ShapeLab, {
        target: pip.document.body,
        props: {
          lab,
          reducedMotion,
          ready: true,
          floatSupported: true,
          floating: true,
          onToggleFloat: closeFloatingWindow,
          animationWindow: pip,
        },
      });
    } catch (error) {
      if (floatingApp) await removeFloatingApp();
      floatingWindow = null;
      pip?.close();
      floatError =
        error instanceof Error
          ? error.message
          : "The floating window could not be opened.";
    }
  }
</script>

<svelte:head>
  <title>Shape Lab — surface area and volume</title>
</svelte:head>

{#if floatingWindow}
  <main
    data-testid="floating-placeholder"
    class="grid min-h-[100dvh] place-items-center bg-gradient-to-b from-paper to-accent-soft/50 p-6 text-center"
  >
    <div
      class="max-w-md rounded-2xl border border-rule bg-panel p-8 shadow-xl shadow-ink/10"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="mx-auto mb-4 h-12 w-12 text-accent"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <rect x="2.5" y="4" width="19" height="15" rx="2.5" />
        <rect x="12" y="10" width="7" height="6" rx="1" fill="currentColor" />
      </svg>
      <h1 class="text-xl font-bold">Shape Lab is floating</h1>
      <p class="mt-2 text-sm text-ink-soft">
        Switch to the textbook tab and keep this tab open. Your work stays in
        the floating window.
      </p>
      <button
        type="button"
        class="mt-5 cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110"
        onclick={closeFloatingWindow}
      >
        Return Shape Lab to this tab
      </button>
    </div>
  </main>
{:else}
  <ShapeLab
    {lab}
    {reducedMotion}
    {ready}
    {floatSupported}
    floating={false}
    onToggleFloat={openFloatingWindow}
    {floatError}
  />
{/if}
