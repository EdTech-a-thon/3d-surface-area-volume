<script lang="ts">
  import { asset } from "$app/paths";
  import DocPage from "$lib/components/DocPage.svelte";
  import { t } from "$lib/i18n/index.svelte";

  const card =
    "mb-6 rounded-2xl border border-rule/70 bg-panel/85 p-6 shadow-lg shadow-ink/10";
  const link = "font-bold text-accent underline-offset-4 hover:underline";
</script>

<svelte:head>
  <title>{t("about.pageTitle")}</title>
  <meta name="description" content={t("about.meta")} />
</svelte:head>

<DocPage title={t("about.title")} lede={t("about.lede")}>
  <section class={card}>
    <div class="mb-3 flex items-center gap-3">
      <img
        src={asset("/edtechathon-logo.svg")}
        alt=""
        class="h-10 w-10 shrink-0"
      />
      <h2 class="text-xl font-bold">{t("about.originTitle")}</h2>
    </div>
    <p class="leading-relaxed text-ink-soft">
      {t("about.origin.beforeEvent")}<a
        href="https://edtechathon.com"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>EdTech-a-thon</a
      >{t("about.origin.afterEvent")}<a
        href="https://teacher.dev"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>teacher.dev</a
      >{t("about.origin.afterTeacher")}
    </p>

    <figure
      class="mx-auto mt-6 w-full max-w-lg -rotate-1 rounded-sm bg-white p-3 pb-6 shadow-lg ring-1 ring-rule/70"
    >
      <img
        src={asset("/edtechathon-2026.jpg")}
        alt={t("about.photoAlt")}
        class="w-full bg-paper"
      />
      <figcaption class="handwriting pt-5 text-center text-lg text-ink-soft">
        EdTech-a-thon 2026
      </figcaption>
    </figure>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">{t("about.purposeTitle")}</h2>
    <p class="leading-relaxed text-ink-soft">
      {t("about.purpose")}
    </p>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">{t("about.promiseTitle")}</h2>
    <ul class="space-y-2 leading-relaxed text-ink-soft">
      <li>
        <span class="font-bold text-ink">{t("about.promise.paywalls")}</span>
      </li>
      <li>
        <span class="font-bold text-ink">{t("about.promise.ads")}</span>
      </li>
      <li>
        <span class="font-bold text-ink">{t("about.promise.tracking")}</span>
      </li>
    </ul>
  </section>

  <section class={card}>
    <h2 class="mb-3 text-xl font-bold">{t("about.feedbackTitle")}</h2>
    <p class="mb-4 leading-relaxed text-ink-soft">
      {t("about.feedback")}
    </p>
    <a
      href="mailto:support@teacher.dev?subject=Geometric%20Solids%20feedback"
      class="inline-block rounded-xl bg-accent px-4 py-2 font-bold text-white transition hover:bg-ink"
      >{t("about.email")}</a
    >
  </section>
</DocPage>
