# Free launch

All available tools and download options are free. Every account and guest workspace receives **1 GB (1,073,741,824 bytes)** of private document storage. Guest workspaces still expire after 24 hours. Signing in keeps files in an account; private files, saved invoices, and short links still require account ownership.

All invoice designs, custom branding, QR codes, and the 200-invoice account library are included. Short links include custom aliases, editable destinations, and 1,000 saved links per account. Existing file, page, concurrency, and abuse limits remain in effect. Connecting translation and Office-conversion providers is separate from pricing; disconnected providers remain unavailable.

## Release order

1. Apply [016_free_launch.sql](../supabase/migrations/016_free_launch.sql) to the production Supabase database after migration 015. It runs in one transaction. It preserves existing files and billing history, disables purchases, enforces 1 GB for every account, updates guest workspace quotas, and unlocks saved invoices and advanced short-link features. Existing accounts above the limit can still export/delete files; no files are deleted by the migration.
2. Verify `select free_access_enabled(), account_storage_limit(null);` returns `true, 1073741824`. `platform_settings.purchases_enabled` must be false.
3. Build/deploy Railway with `NEXT_PUBLIC_FREE_LAUNCH` omitted or set to `true`. This public build-time setting defaults to free access. Do not set it to `false` while the database is in free mode.
4. Verify `/pricing` and localized pricing URLs redirect to the tools directory, `/api/billing/plans` exposes no offers, and `/api/billing/checkout` returns 409. Verify anonymous original-text and protected-PDF downloads, invoice exports, and signed-in storage/account operations. The custom domain serves the Railway deployment, so a separate website deploy is unnecessary.

New purchases were disabled in production before the code release. At that check there were no active/trialing billing subscription records. The full quota/entitlement change requires migration 016; disabling checkout alone does not apply it.

## Future pricing

There is **no timer, trial, or automatic charge**. The proposed six-to-eight-month period is a planning preference, not an expiry in code.

Reintroducing paid plans requires a deliberate release: review and update public copy/translations and terms, configure/verify provider products, set the database `free_access_enabled` to false, and rebuild the app with `NEXT_PUBLIC_FREE_LAUNCH=false`. Only enable purchases after those checks. The migration retains the previous entitlement rules behind the database setting. Do not simply toggle the app flag: launch copy and marketing claims must match the new offer, and existing files must remain accessible when allowances change.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx playwright test --config=playwright.free-launch.config.ts`
- `npx playwright test --config=playwright.invoice.config.ts --project=desktop --project=android`

The SQL test executes migration 016 in an isolated PostgreSQL-compatible database, including exact quotas, concurrent reservations, ownership, suspension, account features, purchase blocking, and explicit restoration of legacy entitlements.

## Production verification — 2026-10-04

Railway deployment `3259937d-40b1-404a-b3f7-78d2e99e01b2` succeeded and serves https://thebestfreepdf.com through the existing GoDaddy/Vercel routing setup. Production database checks confirmed `free_access_enabled=true`, purchases disabled, and 1 GB storage.

A temporary account with no subscription received 1 GB through the production account API, a 1,000-link allowance, and successfully saved an invoice. The account and its invoice were removed afterward. Guest storage, disabled checkout, English/French pricing redirects, anonymous password-protected PDF export, advanced invoice/QR export, and browser downloads were verified on the custom domain. No browser runtime errors occurred. Local validation passed: 166 unit tests, 18 distinct browser scenarios, lint, TypeScript, and the production build.
