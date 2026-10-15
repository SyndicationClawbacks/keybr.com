import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "smoke.spec.mjs",
  timeout: 90000,
  expect: { timeout: 45000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:1420", viewport: { width: 1280, height: 900 }, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "webkit", use: { browserName: "webkit" } }],
  webServer: { command: "node scripts/serve.mjs", url: "http://127.0.0.1:1420", reuseExistingServer: false },
});
