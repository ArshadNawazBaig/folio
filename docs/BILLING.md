# Folio Pro setup

Pro includes configured translation and Office conversion downloads, original text replacement/deletion, replacement font/size/color controls, find and replace across pages, and AES-256 opening-password protection. Free annotation, conversion, and form tools remain available without an account. The initial pricing is $1 USD for the first 7 days, then $25 USD/month automatically, or $25 USD/month starting immediately. An authorized super admin can publish new prices for future purchases at `/admin`. Existing subscribers retain their purchased terms. The website shows the initial amounts before billing is connected; the server requires matching Stripe prices before opening checkout.

The integration code is implemented. No Supabase project, Stripe account, Stripe price IDs, or production domain have been connected in this workspace. Real Google/email sign-in, purchases, renewals, and billing portal flows still need end-to-end verification against your test accounts before launch.

## Preview without credentials

Run the app and open `/edit-pdf-text?demo=1`. The demo processes a fixed sample supplied by the server using the real PDFium engine. The sample endpoint does not accept arbitrary file bytes or run password protection. Separately, `/edit-pdf-text` accepts user files for anonymous text inspection and PNG image previews; these never return edited PDF bytes. A paid subscription or admin-issued courtesy grant is required only for Pro PDF exports. `/pricing` shows the free and Pro features with checkout disabled until configured. There is no local-storage Pro switch or development payment bypass.

Tool listings, search results, and editing workspaces use ordinary tool names without Pro badges or upgrade prompts. Text controls, find and replace, previews, password setup, and connected document processing work before a purchase. The premium plan prompt opens only when a user requests a paid download; dismissing it preserves their edits. Existing free downloads remain free. Plan terms are also available when someone explicitly opens pricing or billing.

## 1. Connect accounts and the database

1. Follow [SETUP.md](SETUP.md) to enable Google sign-in and the email fallback. Folio uses passwordless email links with a browser PKCE flow. Users must open the link in the browser where they requested it.
2. In the project's SQL editor, apply [`001_billing.sql`](../supabase/migrations/001_billing.sql), then [`002_paid_intro.sql`](../supabase/migrations/002_paid_intro.sql), then [`003_platform_admin.sql`](../supabase/migrations/003_platform_admin.sql). The first migration creates billing tables, processing counters, and atomic checkout/entitlement functions. The second permits paid trial access only when the webhook has recorded a verified paid-until boundary. Apply only the migrations not yet applied, in order. Migration 003 adds admin roles, account controls, pricing, support, settings, and courtesy entitlements. It is required before running this version with configured credentials. Browser roles cannot write billing data or invoke the paid processing function.
3. Set the Authentication site URL and allow these redirect URLs: `http://localhost:3000/auth/callback` for development and `https://YOUR_DOMAIN/auth/callback` for production. Also allow the exact callback URLs carrying the `next` parameter listed in [SETUP.md](SETUP.md). Keep the magic-link email template's confirmation URL flow. Configure production email delivery and review your project's authentication rate limits before inviting customers. See [Supabase passwordless email setup](https://supabase.com/docs/guides/auth/auth-email-passwordless).
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key belongs only on the server. Do not paste keys into source code or commit `.env.local`.

The public Supabase values and `NEXT_PUBLIC_SITE_URL` must be present when Next.js builds. Restart development or rebuild production after changing them.

## 2. Configure Stripe in test mode

Create these two Stripe prices:

- **Folio Pro:** recurring $25.00 USD, billed every month, flat per-unit licensed pricing.
- **Folio Pro — 7-day introductory access:** one-time $1.00 USD, flat per-unit pricing. This price is not weekly recurring.

The trial checkout includes both prices, sets `subscription_data.trial_period_days=7`, requires a payment method, and charges the one-time price on the first invoice. The monthly charge begins after the seven days. The direct monthly checkout includes only the $25 recurring price and has no trial delay. Both show renewal terms in Stripe's checkout. This uses Checkout's established trial-delay and mixed-cart features, not the preview Trial Offer API. See [Stripe mixed carts](https://docs.stripe.com/payments/checkout/how-checkout-works) and [Checkout trial settings](https://docs.stripe.com/get-started/use-cases/saas-subscriptions).

The server rejects wrong amounts, currencies, intervals, and inactive/metered/tiered prices. Coupons, zero-payment invoices, annual plans, and adjustable quantities are not offered. The introductory offer is limited to one created introductory subscription per account, checked against Stripe's subscription history. Abandoned checkout before subscription creation does not use the offer. Account deletion/re-creation or multiple accounts are not covered by this per-account limit.

Set these server variables in `.env.local`:

```dotenv
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PRO_MONTHLY_PRICE_ID=price_YOUR_25_USD_MONTHLY_PRICE
STRIPE_PRO_TRIAL_PRICE_ID=price_YOUR_1_USD_ONE_TIME_PRICE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SIGNING_SECRET
```

Both prices are needed for the introductory offer. Monthly checkout can operate with just the validated monthly price; the introductory checkout remains disabled if its price is missing or mismatched. Remove the old `STRIPE_PRO_YEARLY_PRICE_ID` variable if present. Use test prices with test keys. Configure Stripe's billing portal for invoice history, payment-method updates, and cancellation at the end of the paid period, including cancellation during trials. Enable Stripe's trial-ending reminders and billing emails. Keep product switching and trial extensions disabled for this initial integration. Customers can subscribe again at the regular monthly price after a plan ends. The Account page opens the portal for the authenticated user's own customer record.

## 3. Deliver signed webhook events

For local development, use the [Stripe CLI webhook workflow](https://docs.stripe.com/webhooks):

```sh
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Use the listener's signing secret as `STRIPE_WEBHOOK_SECRET`, then restart the app. In production, register `https://YOUR_DOMAIN/api/billing/webhook` with its own signing secret. Use the API version matching the installed Stripe SDK (see `node_modules/stripe/esm/apiVersion.js`); this implementation reads invoice subscription references under `parent.subscription_details` and billing periods from subscription items.

Subscribe to these events:

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`
- `invoice.paid`, `invoice.payment_failed`, `invoice.voided`, `invoice.marked_uncollectible`

The route verifies the signature against the raw body, retrieves the current subscription from Stripe, and associates it with a server-owned customer mapping. A unique event ID prevents duplicate grants; database ordering protects against older events, and terminal subscriptions cannot be restored by a late active snapshot. Monthly access requires an active subscription and a paid invoice line covering the current period. Introductory access requires `trialing` status, the application's offer metadata, the purchased version’s introductory invoice line with quantity one on a paid USD creation invoice, and matching trial dates. Access is capped at the purchased version’s duration from the original trial start and never extends past Stripe's trial/period end. An unpaid or free trial and a checkout success redirect do not grant access. The $1 invoice cannot cover a subsequent monthly period. See [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).

## 4. Verify the connected flow

1. Request a sign-in link at `/account` and complete it in the same browser. Confirm a new account is Free.
2. Start introductory checkout at `/pricing`. Confirm $1 USD due now, seven days until the first $25 USD monthly payment, a saved payment method, and clear cancellation terms in Stripe. Also verify that direct monthly checkout charges $25 today with no $1 item or trial. Use [Stripe test payment methods](https://docs.stripe.com/testing), never a real card in test mode.
3. Complete a test payment and confirm successful webhook delivery. Refresh subscription status in Account, then return to a PDF you edited before paying and download it without losing changes. Also download a password-protected PDF. Verify the password with a separate PDF reader.
4. Test abandoned checkout, switching introductory/monthly choices before payment, duplicate checkout attempts, duplicate webhook delivery, failed $1 payment, failed $25 renewal, payment recovery, and cancellation during the introductory week. Use Stripe test clocks where appropriate to advance through the trial boundary; verify the next successful invoice is $25 and the $1 item never repeats. Verify expired/past-due access is denied by `/api/pro/pdf`, not merely hidden in the interface. Verify a canceled customer can subscribe again monthly but cannot repeat the introductory offer. Test with the actual mixed checkout rather than a generic synthetic subscription fixture.
5. Confirm signing out and attempts with another account cannot access the original customer's billing portal or Pro processing. Test malformed webhook signatures. A synthetic Stripe CLI event without Folio's customer mapping must not grant access.
6. Complete a live-mode review with matching live product prices, server key, webhook signing secret, HTTPS domain, email configuration, and portal settings before opening sales. The code's readiness check verifies configuration presence; it cannot prove that your dashboard configuration or webhook delivery is correct.

Refunds and disputes do not automatically change this application's access policy. If a refund/dispute should end access, also cancel the subscription in Stripe; its signed subscription event revokes access. Do not edit client flags or billing rows to implement cancellations.

## Processing, storage, and deployment limits

Paid requests first verify the Supabase bearer token with `getUser`, then check suspension and atomically check paid subscription or unexpired courtesy access and processing quota in PostgreSQL. Limits are 500 operations per UTC day and 20 per minute per account; each Pro PDF download attempt counts, including failed processing after authorization. Anonymous inspection/preview has a separate instance budget (90 requests/minute), with a shared two-worker concurrency ceiling. It does not consume the paid download quota. Processing rejects files above 10 MB or 100 pages. Webhook, JSON, multipart, PDF output, page objects, and change counts also have size bounds.

The Node route starts a fresh PDFium child process with no account/payment secrets in its environment, a 30-second timeout, a V8 heap setting, bounded output, and at most two concurrent workers per app process. The heap setting does not impose a hard limit on WASM/native process memory. For public production use, set host-level CPU/memory limits, restrict filesystem access, and put request/rate controls at the ingress. A child process is not an OS security sandbox. The sample endpoint is public and should also be covered by ingress rate limiting.

Deploy to a Node host that supports child processes and the bundled PDFium WASM/scripts. Build tracing includes these dependencies. Keep their MIT and PDFium third-party license notices when distributing. Allow the multipart request budget at your reverse proxy/host; hosting platforms with smaller request-body limits require a lower advertised file limit or a separate upload service. Run from the application root with `npm start`.

The Pro processing routes do not persist uploaded PDF bytes or passwords to their filesystem, object storage, or database. It processes them in request/worker memory and returns the output. PostgreSQL stores account references, billing state, usage counters, admin roles/settings/audit records, and support conversations. Older browser drafts can be explicitly migrated. New signed-in Pro text recovery drafts are saved to private Supabase Storage when the download gate opens and standalone tools attempt removal after a successful download or selection of another PDF; the main editor now uses per-document autosave after migration 006; drafts older than seven days are not restored. Guest work in standalone processing tools stays in the open tab until sign-in; main-editor guest workspaces are saved privately for 24 hours. Configure the host to avoid request-body logging and core dumps, and review infrastructure logging separately from application behavior. Separately, the customer dashboard can explicitly save PDFs in private Supabase Storage after migration 004; see [DASHBOARD.md](DASHBOARD.md). There is no background processing queue.

For larger traffic, move Pro processing to isolated workers behind a durable queue and temporary private object storage. This synchronous implementation has not been load-tested for one million users. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Pricing administration

See [ADMIN.md](ADMIN.md). The active catalog is stored in `pricing_versions` with a pointer in `platform_settings`. The initial version can use the two environment price IDs above. The first admin publication pins those initial IDs in the database before activating new prices. Later publications create new Stripe products/prices and retain old versions for webhook entitlement calculation. Do not delete old price versions or repurpose the initial environment IDs. Existing customers are never automatically migrated to a newly published monthly price.

Checkout submits the displayed version ID and rejects a stale version before opening payment. Introductory eligibility remains once per account across pricing versions. Pausing purchases prevents new checkout creation; an already-open Stripe Checkout session can still be paid. Expire outstanding sessions in Stripe if sales must stop completely. Maintenance keeps the billing portal and signed webhook endpoint reachable.
