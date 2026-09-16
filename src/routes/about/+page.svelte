<script lang="ts">
  import { asset } from "$app/paths";
  import DocPage from "$lib/components/DocPage.svelte";

  const card =
    "mb-6 rounded-2xl border border-rule/70 bg-panel/85 p-6 shadow-lg shadow-ink/10";
  const link = "font-bold text-accent underline-offset-4 hover:underline";
</script>

<svelte:head>
  <title>About — Shape Lab</title>
  <meta
    name="description"
    content="Shape Lab is a free, ad-free classroom tool for teaching surface area and volume, built by teacher.dev."
  />
</svelte:head>

<DocPage
  title="About"
  lede="A teacher-led demonstration of how a solid's dimensions relate to its surface area and volume."
>
  <section class={card}>
    <div class="mb-3 flex items-center gap-3">
      <img
        src={asset("/edtechathon-logo.svg")}
        alt=""
        class="h-10 w-10 shrink-0"
      />
      <h2 class="text-xl font-bold">From the EdTech-a-thon</h2>
    </div>
    <p class="leading-relaxed text-ink-soft">
      Shape Lab came out of the
      <a
        href="https://edtechathon.com"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>EdTech-a-thon</a
      >, a community of builders making free tools for classrooms. It is
      maintained by
      <a
        href="https://teacher.dev"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>teacher.dev</a
      >, where you can find the rest of what we are building.
    </p>

    <figure
      class="mx-auto mt-6 w-full max-w-lg -rotate-1 rounded-sm bg-white p-3 pb-6 shadow-lg ring-1 ring-rule/70"
    >
      <img
        src={asset("/edtechathon-2026.jpg")}
        alt="Participants of the 2026 EdTech-a-thon"
        class="w-full bg-paper"
      />
      <figcaption class="handwriting pt-5 text-center text-lg text-ink-soft">
        EdTech-a-thon 2026
      </figcaption>
    </figure>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">What it is for</h2>
    <p class="leading-relaxed text-ink-soft">
      Put a solid on the board, change its dimensions, and watch the surface
      area and the volume move with them. Every total is kept exact — as a
      multiple of π or a square root where that is the honest answer — so the
      class can see where a formula comes from before anyone reaches for a
      calculator. Unfold a solid into its net to see the surface area as the
      faces it is actually made of.
    </p>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">Our promise</h2>
    <ul class="space-y-2 leading-relaxed text-ink-soft">
      <li><span class="font-bold text-ink">Zero paywalls.</span></li>
      <li><span class="font-bold text-ink">Zero ads.</span></li>
      <li>
        <span class="font-bold text-ink">Zero tracking of personal data.</span>
      </li>
    </ul>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">Feedback &amp; ideas</h2>
    <p class="mb-4 leading-relaxed text-ink-soft">
      We'd love to hear from you. Tell us what's working, what's not, or pitch
      us an idea for a tool you wish existed. We're here to help.
    </p>
    <a
      href="mailto:support@teacher.dev?subject=Shape%20Lab%20feedback"
      class="inline-block rounded-xl bg-accent px-4 py-2 font-bold text-white transition hover:bg-ink"
      >Email support@teacher.dev</a
    >
  </section>
</DocPage>
