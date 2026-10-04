# Free launch

All available tools and download options are free. Guests receive **100 MB (104,857,600 bytes)** and signed-in accounts receive **1 GB (1,073,741,824 bytes)** of private document storage. Guest workspaces still expire after 24 hours. Signing in keeps files in an account; private files, saved invoices, and short links still require account ownership.

All invoice designs, custom branding, QR codes, and the 200-invoice account library are included. Short links include custom aliases, editable destinations, and 1,000 saved links per account. Existing file, page, concurrency, and abuse limits remain in effect. Connecting translation and Office-conversion providers is separate from pricing; disconnected providers remain unavailable.

## Release order

1. Apply [016_free_launch.sql](../supabase/migrations/016_free_launch.sql) to the production Supabase database after migration 015. It runs in one transaction. It preserves existing files and billing history, disables purchases, enforces 1 GB for every account, updates guest workspace quotas, and unlocks saved invoices and advanced short-link features. Existing accounts above the limit can still export/delete files; no files are deleted by the migration.
2. Apply [017_guest_storage_limit.sql](../supabase/migrations/017_guest_storage_limit.sql) to set the guest allowance to 100 MB. Verify `select free_access_enabled(), account_storage_limit(null);` returns `true, 104857600`; `account_storage_limit` with a real account UUID must return `1073741824`. `platform_settings.purchases_enabled` must be false.
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

The SQL test executes migrations 016 and 017 in an isolated PostgreSQL-compatible database, including exact quotas, concurrent reservations, ownership, suspension, account features, purchase blocking, and explicit restoration of legacy entitlements.

## Production verification — 2026-10-04

Railway deployment `3259937d-40b1-404a-b3f7-78d2e99e01b2` succeeded and serves https://thebestfreepdf.com through the existing GoDaddy/Vercel routing setup. Production database checks confirmed `free_access_enabled=true`, purchases disabled, and 1 GB storage.

A temporary account with no subscription received 1 GB through the production account API, a 1,000-link allowance, and successfully saved an invoice. The account and its invoice were removed afterward. Guest storage, disabled checkout, English/French pricing redirects, anonymous password-protected PDF export, advanced invoice/QR export, and browser downloads were verified on the custom domain. No browser runtime errors occurred. Local validation passed: 166 unit tests, 18 distinct browser scenarios, lint, TypeScript, and the production build.

## Guest quota and translation follow-up — 2026-10-04

The translation release `5ea9476` is live on Railway deployment `5264c816-c27d-4360-8656-3a298405b304`. It fills missing free-access copy across the 11 translated languages, fixes untranslated account/support messages and storage labels, and corrects home-page wording. Direct HTTPS checks on the custom domain verified translated tool copy in all 11 languages. The 15 published articles contain no guest-specific 1 GB claim.

Guest quota changes are committed in `715eec7`: guests receive 100 MB, while signed-in accounts keep 1 GB. Migration 017 preserves existing files, enforces reservations and workspace growth under the existing database locks, and allows guests above the new limit to reduce stored content or claim it after sign-in. Local validation passed 169 unit tests, all 14 dashboard-language scenarios, the 12 public-language scenarios, lint, TypeScript, and a production build.

**Rollout pending:** the user chose to apply migration 017 in the Supabase SQL Editor. The last production database check still returned `1073741824` for `account_storage_limit(null)`. The 100 MB app release has therefore not been deployed. After the migration returns `104857600` for guests, deploy the current main branch to Railway and verify `/api/workspaces` reports 100 MB, authenticated `/api/account/files` reports 1 GB, and concurrent guest reservations cannot exceed 100 MB. The live language release retains the current database quota until that coordinated rollout.
