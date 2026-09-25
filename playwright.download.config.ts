import { defineConfig, devices } from '@playwright/test';
import base from './playwright.tools.config';

export default defineConfig({
  ...base,
  testMatch: '**/mobile-download.spec.ts',
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
