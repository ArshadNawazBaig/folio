import { defineConfig, devices } from '@playwright/test';
import base from './playwright.tools.config';

export default defineConfig({
  ...base,
  outputDir: 'test-results-downloads',
  testIgnore: [],
  testMatch: [
    'mobile-download.spec.ts',
    'mobile-tool-download.spec.ts',
    'mobile-account-download.spec.ts',
    'webp-download.spec.ts',
  ],
  webServer: {
    ...base.webServer,
    command: 'node scripts/test-auth-server.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
