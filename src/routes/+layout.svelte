<script lang="ts">
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <title>Shape Lab — surface area and volume</title>
</svelte:head>

{@render children()}
