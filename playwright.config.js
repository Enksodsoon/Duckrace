import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Each test owns a WebGL scene; avoid competing GPU/software-renderer contexts.
  workers: 1,
  reporter: 'list',
  maxFailures: process.env.CI ? 1 : 0,
  // Hosted Linux runners rasterize WebGL in software; full GPU timings are
  // qualified separately by the opt-in real-time performance suite.
  timeout: process.env.CI ? 300_000 : 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:4173',
    // Keep the full desktop navigation while bounding software rasterization.
    // Visual/performance suites explicitly override this with their target sizes.
    viewport: process.env.CI ? { width: 960, height: 540 } : { width: 1280, height: 720 },
    launchOptions: process.env.PW_SOFTWARE_RENDERER === '1'
      ? { args: ['--use-angle=swiftshader-webgl'] }
      : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
});
