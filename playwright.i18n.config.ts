import { defineConfig } from '@playwright/test';
import blog from './playwright.blog.config';
export default defineConfig({
  ...blog,
  testMatch: ['i18n.spec.ts', 'expanded-i18n.spec.ts', 'seo.spec.ts'],
  outputDir: 'test-results-i18n',
});
