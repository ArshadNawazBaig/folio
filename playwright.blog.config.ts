import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'blog-public.spec.ts',
  outputDir: 'test-results-blog',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    ...devices['Desktop Chrome'],
    channel: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/test-blog-server.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
