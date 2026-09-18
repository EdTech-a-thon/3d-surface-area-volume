<script lang="ts">
  import DocPage from "$lib/components/DocPage.svelte";
  import { t } from "$lib/i18n/index.svelte";

  const card =
    "mb-6 rounded-2xl border border-rule/70 bg-panel/85 p-6 shadow-lg shadow-ink/10";
  const link = "font-bold text-accent underline-offset-4 hover:underline";
</script>

<svelte:head>
  <title>{t("privacy.pageTitle")}</title>
  <meta name="description" content={t("privacy.meta")} />
</svelte:head>

<DocPage title={t("privacy.title")} lede={t("privacy.lede")}>
  <section class={card}>
    <p class="leading-relaxed text-ink-soft">
      {t("privacy.local")}
    </p>
    <p class="mt-4 leading-relaxed text-ink-soft">
      {t("privacy.analytics.beforeLink")}<a
        href="https://www.cloudflare.com/privacypolicy/"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>{t("privacy.analytics.link")}</a
      >{t("privacy.analytics.afterLink")}
    </p>
    <p class="mt-4 leading-relaxed text-ink-soft">
      {t("privacy.contact")}<a
        href="mailto:support@teacher.dev?subject=Geometric%20Solids%20privacy"
        class={link}>support@teacher.dev</a
      >.
    </p>
  </section>
</DocPage>
