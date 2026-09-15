# Connect Folio

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

## 4. Translation and Office conversions

Set a unique server-only `DOCUMENT_RESULT_KEY` (32 random bytes represented by 64 hexadecimal characters). Generate it with a password manager or locally using `openssl rand -hex 32`. Keep the same secret on every instance. Rotating it invalidates already prepared files.

For translation, enable Google Cloud Translation Advanced in a billing-enabled Google Cloud project. Create a service account with the Cloud Translation API User role, or the equivalent permission for document translation. Set these server variables from its credentials:

```dotenv
GOOGLE_TRANSLATION_PROJECT_ID=your-project-id
GOOGLE_TRANSLATION_CLIENT_EMAIL=translator@your-project-id.iam.gserviceaccount.com
GOOGLE_TRANSLATION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

These service-account credentials are separate from the OAuth client used for Google login. Folio calls `projects/{project}/locations/us-central1:translateDocument` with inline PDF bytes, receives PDF bytes, and creates a preview. No Cloud Storage bucket is required. The official [document API reference](https://cloud.google.com/translate/docs/reference/rest/v3/projects.locations/translateDocument) defines the request, supported PDF format, permissions, and output. The app permits 10 MB and 20 pages per translation and retains Google's document attribution. Test real multilingual PDFs and scans before opening the service to customers.

For PDF-to-Word, Excel, and PowerPoint, set `CONVERTAPI_TOKEN` from your ConvertAPI account. Folio uses its PDF-to-DOCX/XLSX/PPTX endpoints, requests binary output with `StoreFile=false`, and accepts at most 10 MB and 100 source pages. See [ConvertAPI content types](https://www.convertapi.com/docs/content-types) and [PDF to DOCX](https://www.convertapi.com/pdf-to-docx).

Service availability is derived from configuration on the server; it is not proof that keys or provider subscriptions are valid. Without configuration, processing stays disabled and original previews still work. Invalid provider credentials, quota failures, malformed files, and timeouts show errors. Website cards, tool pages, metadata, and the sitemap follow configured availability after restart. Standalone OCR, Office-to-PDF, and guaranteed layout matching are not included.

Processing is anonymous and can incur provider charges before a customer buys. `DOCUMENT_DAILY_BUDGET` defaults to 50 attempts per server instance per UTC day; `0` pauses processing. There are also 6 attempts/minute and 2 concurrent jobs per instance. Restarts reset these counters. Configure provider spending limits and distributed ingress controls before public deployment. This implementation has no distributed processing queue and is not a million-user capacity claim.

Prepared results are encrypted with authenticated AES-256-GCM and expire after 24 hours. The client gets encrypted bytes and optional readable page images; the server releases decrypted files only after checking the user's current paid/courtesy access and quota. At the paywall, signed-in users save the encrypted result to private Supabase Storage for checkout recovery. Open editor tabs and older browser drafts are accessible to users of the same browser profile. These processing routes do not persist PDF bytes in cloud storage. The main editor separately uploads PDFs and autosaves workspaces for accounts and 24-hour guest sessions; see [DASHBOARD.md](DASHBOARD.md) and apply migrations 004–006.

Deploy these routes on a Node server supporting child processes, the bundled PDFium WASM engine, request bodies up to 30 MB, and processing requests up to 180 seconds. Platforms with lower fixed body or duration limits need a separate worker/upload architecture. Google and ConvertAPI calls time out; failed or cancelled attempts may still incur provider fees. Provider retention terms apply separately from Folio's memory-only processing.

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

`check:setup` only reports configuration presence and safe URL checks; it never prints secrets or makes provider requests. The browser auth suite uses real Supabase client code with simulated transport on an isolated development server. The server tests use real PDF processing, local PostgreSQL, and simulated provider responses. These tests do not establish successful Google consent, real conversion quality, or live payment processing.

Before production, verify with your connected test accounts: Google signup and return login; ordinary/admin separation; email fallback and logout; payment cancellation and successful payment; signed webhook delivery and renewals; download recovery; all three Office formats; translation pages including RTL; admin operations; support replies; and maintenance recovery. Follow [SEO.md](SEO.md) for the real domain and indexing settings. Public pages have server-rendered content and metadata; accounts, admin, support, and document APIs remain noindex.
