import { defineConfig } from '@playwright/test';
import blog from './playwright.blog.config';

// Uses the local public-content fixture, never customer accounts or production documents.
export default defineConfig({
  ...blog,
  testMatch: ['seo.spec.ts', 'blog-public.spec.ts'],
});
