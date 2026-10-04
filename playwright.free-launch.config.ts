import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: ['free-launch.spec.ts', 'tool-access.spec.ts'],
  outputDir: 'test-results/free-launch',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chromium',
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/test-auth-server.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
