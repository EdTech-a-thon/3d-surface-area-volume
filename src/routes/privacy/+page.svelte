<script lang="ts">
  import DocPage from "$lib/components/DocPage.svelte";

  const card =
    "mb-6 rounded-2xl border border-rule/70 bg-panel/85 p-6 shadow-lg shadow-ink/10";
  const link = "font-bold text-accent underline-offset-4 hover:underline";
</script>

<svelte:head>
  <title>Privacy — Shape Lab</title>
  <meta
    name="description"
    content="What Shape Lab collects, what it doesn't, and why."
  />
</svelte:head>

<DocPage title="Privacy" lede="What we collect, what we don't, and why.">
  <section class={card}>
    <p class="leading-relaxed text-ink-soft">
      Shape Lab does not collect personal information from teachers or students.
      There are no accounts, and nothing you type into it — dimensions, units,
      the solid you pick — is sent anywhere or saved anywhere. It all lives in
      the page for as long as the tab is open, and it is gone when you close it.
    </p>
    <p class="mt-4 leading-relaxed text-ink-soft">
      We use Cloudflare Web Analytics to anonymously count visits, which helps
      us understand how Shape Lab is being used in classrooms. Cloudflare Web
      Analytics is cookieless, does not fingerprint visitors, and does not track
      users across other sites; see Cloudflare's
      <a
        href="https://www.cloudflare.com/privacypolicy/"
        target="_blank"
        rel="noopener noreferrer"
        class={link}>privacy policy</a
      > for details. We do not share, sell, or otherwise transfer any visitor data
      to third parties.
    </p>
    <p class="mt-4 leading-relaxed text-ink-soft">
      Questions or concerns? Email
      <a
        href="mailto:support@teacher.dev?subject=Shape%20Lab%20privacy"
        class={link}>support@teacher.dev</a
      >.
    </p>
  </section>
</DocPage>
