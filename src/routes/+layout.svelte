<script lang="ts">
  import "../app.css";
  import { env } from "$env/dynamic/public";

  let { children } = $props();

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
