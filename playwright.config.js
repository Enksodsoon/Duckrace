import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Each test owns a WebGL scene; avoid competing GPU/software-renderer contexts.
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
