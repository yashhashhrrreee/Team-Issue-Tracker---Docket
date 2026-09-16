import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // shared seeded DB — parallel specs would race on the same rows
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "edge",
      // Bundled Chromium download is blocked in this environment;
      // channel points Playwright at the already-installed system Edge
      // instead (see Decisions.md, Phase 5).
      use: { ...devices["Desktop Chrome"], channel: "msedge" },
    },
  ],
  webServer: [
    {
      command:
        '".venv/Scripts/python.exe" -m flask --app run run --port 5000',
      cwd: "../backend",
      port: 5000,
      reuseExistingServer: true,
      env: { FRONTEND_ORIGIN: "http://localhost:5173", FLASK_ENV: "development" },
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
