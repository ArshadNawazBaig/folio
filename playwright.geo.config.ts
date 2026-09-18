import { defineConfig } from '@playwright/test';
import blog from './playwright.blog.config';

// By default use isolated public-content fixtures. The optional audit URL only receives GETs.
const auditOrigin = process.env.GEO_AUDIT_URL
  ? new URL(process.env.GEO_AUDIT_URL).origin
  : undefined;

export default defineConfig({
  ...blog,
  testMatch: 'geo.spec.ts',
  outputDir: 'test-results/geo',
  reporter: [['list'], ['json', { outputFile: 'test-results/geo-report.json' }]],
  use: {
    ...blog.use,
    baseURL: auditOrigin || blog.use?.baseURL,
    javaScriptEnabled: false,
  },
  webServer: auditOrigin ? undefined : blog.webServer,
});
