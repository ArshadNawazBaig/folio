import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'date-picker.spec.ts',
  outputDir: 'test-results/calendar',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3108',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 1440, height: 1000 },
        timezoneId: 'America/New_York',
      },
    },
    {
      name: 'android',
      use: { ...devices['Pixel 7'], channel: 'chromium', timezoneId: 'Asia/Karachi' },
    },
    { name: 'iphone', use: { ...devices['iPhone 13'], timezoneId: 'America/Los_Angeles' } },
  ],
  webServer: {
    command: 'FOLIO_TEST_PORT=3108 node scripts/test-auth-server.mjs',
    url: 'http://127.0.0.1:3108',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
