import { defineConfig, devices } from "@playwright/test";

// End-to-end tests sign people up and delete them, so they only ever run
// against a separate test Supabase project (docs/testing.md).
const LIVE_PROJECT = "lvzbonyyvieaylwqwukv";
const url = process.env.E2E_SUPABASE_URL;
const key = process.env.E2E_SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error("Set E2E_SUPABASE_URL and E2E_SUPABASE_ANON_KEY to a test project. See docs/testing.md.");
}
if (url.includes(LIVE_PROJECT)) {
  throw new Error("E2E_SUPABASE_URL is the live project. Use a separate test project.");
}

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // One long journey per account; Supabase also rate-limits sign-ups.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // A phone-sized screen, as most people use Dovie.
    ...devices["Pixel 7"],
    // The service worker would serve saved pages between steps.
    serviceWorkers: "block",
  },
  webServer: {
    // A production build of the app pointed at the test project. Variables set
    // here win over apps/web/.env.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
      NEXT_PUBLIC_SENTRY_DSN: "",
      GEMINI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
    },
  },
});
