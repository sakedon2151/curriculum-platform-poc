import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{
    name: "desktop-chromium",
    use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" },
  }],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
