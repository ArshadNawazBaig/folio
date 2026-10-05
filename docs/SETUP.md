# Connect Folio

**Free launch:** all available tools and options are currently free; signed-in accounts receive 1 GB and guest workspaces receive 100 MB. The pricing distinctions below describe the retained paid-mode implementation. Apply migrations 016 and 017 before deploying this release; see [FREE-LAUNCH.md](FREE-LAUNCH.md).

The application code runs locally now. Google sign-in, live administration, purchases, translation, and Office conversion require your service accounts. Use `npm run check:setup` to check which credentials are present in your workspace. Do not send private keys in chat; put them in `.env.local` or your deployment's secret settings.

## 1. Supabase and Google sign-in

1. Fill in the project's `.env` file (or copy `.env.example` to `.env` if it is missing). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project. If you use `.env.local`, its values take precedence over `.env`.
2. Apply migrations 001, 002, 003, 004, 005, 006, [007](../supabase/migrations/007_admin_user_deletion.sql), [008](../supabase/migrations/008_plan_storage_limits.sql), [009](../supabase/migrations/009_blog.sql), [010](../supabase/migrations/010_lemon_squeezy.sql), [011](../supabase/migrations/011_guest_dashboard.sql), and [012](../supabase/migrations/012_monthly_unlimited_storage.sql) in order in Supabase's SQL editor. Apply only missing migrations. Migration 007 enables permanent user deletion; 008 enforces 100 MB Free / 1 GB Pro private storage; 009 enables the blog, post revisions, likes, and editorial image storage; 010 connects Lemon Squeezy billing; 011 adds guest dashboard file management and transfer at sign-in; 012 keeps paid trials and courtesy access at 1 GB and gives verified monthly subscribers unlimited storage. After deploying 012, re-sync existing subscriptions as described in [BILLING.md](BILLING.md#storage-allowances). Applying these migrations does not delete existing accounts or files.
3. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type **Web application**. Add your site origin as an authorized JavaScript origin. Use the exact callback shown by Supabase's Google provider settings as Google's **Authorized redirect URI**, normally `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. In Supabase Authentication → Sign In / Providers → Google, enable Google and save that Google client ID and secret. `.env` includes `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as optional configuration reference fields, so you can keep the names alongside the other credentials. The application does not read these two fields: copy their values into Supabase's Google provider settings to enable sign-in. Never prefix the secret with `NEXT_PUBLIC_`. Use only the default basic identity scopes. Configure test users while the Google consent screen is in testing; publish/verify your consent configuration as Google requires before wider release.
5. Set Supabase's Site URL to your application's real origin. In its redirect allowlist, add `/auth/callback` and the exact callback URLs generated for each allowed destination below. Include both development and production origins as needed. The OAuth callback registered with Google and this application's callback are different endpoints.

Generate the redirect URLs locally (replace the example origin):

```sh
node --input-type=module - <<'JS'
const origin = 'http://localhost:3000';
console.log(new URL('/auth/callback', origin).href);
for (const next of ['/account', '/admin', '/pricing', '/pricing?plan=trial', '/pricing?plan=month', '/support', '/workspace', '/documents', '/edit-pdf-text', '/protect-pdf']) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', next);
  console.log(url.href);
}
const editor = new URL('/auth/callback', origin);
editor.searchParams.set('next', '/account');
editor.searchParams.set('return_to', 'editor');
console.log(editor.href);
JS
```

6. Leave email authentication enabled for the email-link fallback, retain Supabase's confirmation-link template, and configure your production email sender. Email links must be opened in the same browser profile where sign-in began.
7. Restart development or rebuild production after changing public environment variables. Open `/account` and use **Continue with Google**. First-time users receive an account through Supabase; returning users get a session. Signed-in users can sign out from `/account`.

Google sign-in uses Supabase's PKCE flow. The application permits only known internal return destinations, strips callback secrets from browser history, and handles cancellation and expired codes. Google profile metadata never grants an administrative role. Official setup references: [Supabase Google provider](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls). The button uses Google's official G image from its [branding assets](https://developers.google.com/identity/branding-guidelines).

The download dialog opens Google sign-in in a separate tab and keeps the editor mounted, including unsaved edits. Include the generated `return_to=editor` callback in Supabase's redirect allowlist. After the code exchange, Supabase shares the session with the editor, which claims its guest workspace for the account and verifies download access. The sign-in tab closes after success; browsers that prevent automatic closing show a return-to-document message. Blocked tabs, cancelled sign-in, and expired codes leave the editor open for retry. Signing in does not purchase a plan or grant premium access.

## 2. Assign the super admin

Sign in with the intended Google account first. Follow [ADMIN.md](ADMIN.md) to assign its actual Supabase user ID in `public.super_admins`. Provisioning is a trusted database operation. There is no default password, public admin signup, or browser role setting. Afterwards, sign in at `/admin` or refresh your account and open the dashboard. A Google login started from `/account` also sends verified admins to `/admin`.

Test a second ordinary Google account: it must not gain access to `/api/admin`. A regular account that starts Google login from `/admin` returns to its account with a clear access notice. Super admin status does not automatically grant paid PDF downloads; billing and courtesy grants are separate.

## 3. Lemon Squeezy

Follow [BILLING.md](BILLING.md) to configure test keys, matching prices, signed webhooks, and the customer billing portal. Initial offers are **$1 for 7 days, then $25/month**, or **$25/month immediately**. Editing and preparation happen before purchase; only Pro downloads require verified access. Existing free tools remain free.

## 4. Removed document services

PDF translation and PDF-to-Word, Excel, and PowerPoint were removed on October 5, 2026 because they depend on paid external processing. No CloudConvert, ConvertAPI, or Google Cloud Translation account is required. Old tool URLs return 404; the processing endpoint returns 410 without reading the PDF or contacting a provider.

Keep `DOCUMENT_RESULT_KEY` only if existing encrypted result records must remain readable until they expire. Other document-service credentials are no longer read. Google OAuth credentials for sign-in are separate and remain necessary. See [PROCESSING-SERVICES.md](PROCESSING-SERVICES.md).

## 5. Verify and launch

```sh
npm run check:setup
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:auth
```

To test alongside an existing server on port 3000, use `PLAYWRIGHT_PORT=3002 npm run test:e2e`. The auth suite uses port 3001 with separate build output and test artifacts.

`check:setup` only reports configuration presence and safe URL checks; it never prints secrets or makes provider requests. The browser auth suite uses real Supabase client code with simulated transport on an isolated development server. The server tests use real PDF processing, local PostgreSQL, and retired-service checks. These tests do not establish successful Google consent, real conversion quality, or live payment processing.

Before production, verify with your connected test accounts: Google signup and return login; ordinary/admin separation; email fallback and logout; payment cancellation and successful payment; signed webhook delivery and renewals; download recovery; all three Office formats; translation pages including RTL; admin operations; support replies; and maintenance recovery. Follow [SEO.md](SEO.md) for the real domain and indexing settings. Public pages have server-rendered content and metadata; accounts, admin, support, and document APIs remain noindex.
