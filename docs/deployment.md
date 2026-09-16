# Deployment

The app is a fully prerendered static site (`@sveltejs/adapter-static`), so all
configuration is read at **build time** and baked into the generated HTML.

## Cloudflare Web Analytics

`src/routes/+layout.svelte` emits the Cloudflare beacon script into `<head>`
when `PUBLIC_CF_BEACON_TOKEN` is set, and emits nothing when it is not.

To enable it on Vercel:

1. In the Cloudflare dashboard, go to Analytics & Logs → Web Analytics, add the
   site, and copy the `token` value from the provided snippet.
2. In Vercel, open the project's Settings → Environment Variables and add
   `PUBLIC_CF_BEACON_TOKEN` with that token, for the environments you want
   measured (usually Production, optionally Preview).
3. Redeploy. Because the value is inlined at build time, editing the variable
   has no effect until the next build.

Locally, copy `.env.example` to `.env` and fill in the token to test.

The `PUBLIC_` prefix is required: SvelteKit only exposes variables with that
prefix to the browser.
