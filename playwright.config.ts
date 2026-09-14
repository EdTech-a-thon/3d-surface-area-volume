import { defineConfig, devices } from "@playwright/test";

// The dev server must already be running through the workspace port allocator:
//   ./scripts/agent-dev.mjs 3d-surface-area-volume --no-pocketbase
// It prints the leased port; pass it in as BASE_URL when running these tests.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
