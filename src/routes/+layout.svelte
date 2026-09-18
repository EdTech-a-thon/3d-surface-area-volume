<script lang="ts">
  import "../app.css";
  import { env } from "$env/dynamic/public";
  import RebrandNotice from "$lib/components/RebrandNotice.svelte";
  import { current, initializeLanguage } from "$lib/i18n/index.svelte";
  import { isShapeLabReferral } from "$lib/ui/legacyReferral";
  import { onMount } from "svelte";

  let { children } = $props();
  let showRebrandNotice = $state(false);

  onMount(() => {
    initializeLanguage();
    showRebrandNotice = isShapeLabReferral(
      document.referrer,
      window.location.href,
    );
  });

  $effect(() => {
    document.documentElement.lang = current().locale;
  });

  // Cloudflare Web Analytics. Set PUBLIC_CF_BEACON_TOKEN (Vercel project
  // environment variables) to enable the beacon; unset means no tracking at all.
  const beaconToken = env.PUBLIC_CF_BEACON_TOKEN;
</script>

<svelte:head>
  {#if beaconToken}
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: beaconToken })}
    ></script>
  {/if}
</svelte:head>

{@render children()}

{#if showRebrandNotice}
  <RebrandNotice />
{/if}
