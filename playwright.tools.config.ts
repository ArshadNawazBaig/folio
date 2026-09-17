import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Repeatable tool checks, with isolated build output and local account transport.
// Actual PDF/image engines run normally; no customer files or provider keys are used.
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3001' },
  webServer: {
    command: 'node scripts/test-blog-server.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
