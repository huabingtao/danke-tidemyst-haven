import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 10000 },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 30000,
        },
        {
          command: "npm run dev:stats",
          url: "http://127.0.0.1:3009/api/stats",
          reuseExistingServer: !process.env.CI,
          timeout: 30000,
        },
      ],
  reporter: "list",
});
