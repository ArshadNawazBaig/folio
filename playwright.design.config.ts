import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';
export default defineConfig({
  ...auth,
  testMatch: 'design-consistency.spec.ts',
  outputDir: 'test-results-design',
  timeout: 180_000,
  webServer: {
    ...auth.webServer,
    command: 'node scripts/test-auth-server.mjs',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
  },
});
