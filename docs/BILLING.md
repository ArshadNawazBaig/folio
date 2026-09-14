# Lemon Squeezy billing

Folio uses Lemon Squeezy hosted checkout, signed webhooks, and the customer portal. Stripe is no longer used by the application. This replacement assumes billing has not launched; it does not migrate or cancel existing provider subscriptions.

The initial offers remain **$1 USD for 7 days, then $25/month**, or **$25/month immediately**. Only premium downloads require paid access. Editing and existing free tools remain available before payment. Checkout opens in a separate tab from the editor so the document remains available.

## Connect the account

1. Apply any missing Supabase migrations, including [010_lemon_squeezy.sql](../supabase/migrations/010_lemon_squeezy.sql). Do not rerun already applied migrations. The new migration preserves existing users, files, pricing history, and billing rows.
2. In Lemon Squeezy, create a USD store and enable test mode. Create two **subscription variants** with standard pricing and quantity one:

| Variant      | Recurring price | Trial  | One-time setup fee |
| ------------ | --------------- | ------ | ------------------ |
| Monthly      | $25 every month | None   | None               |
| Introductory | $25 every month | 7 days | $1                 |

The introductory variant uses a setup fee with a free-trial delay for the recurring charge. The setup fee is the paid introductory access; a free trial without this payment does not grant access. Do not make the introductory variant a $1/month subscription or a standalone one-time product. [Lemon Squeezy pricing models](https://docs.lemonsqueezy.com/help/products/pricing-models).

3. Publish both variants/products. Copy their numeric variant IDs, the store ID, and an API key into the variables already added to `.env`. If `.env.local` exists, its values take precedence. These are all server variables:

```dotenv
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=
LEMON_SQUEEZY_TEST_MODE=true
LEMON_SQUEEZY_MONTHLY_VARIANT_ID=
LEMON_SQUEEZY_TRIAL_VARIANT_ID=
```

4. Set `NEXT_PUBLIC_SITE_URL` to your application's origin. In production use the real HTTPS domain. This determines the return link to `/dashboard?view=billing&checkout=success`.
5. Create a webhook in the **same store and mode** pointing to `https://YOUR_DOMAIN/api/billing/webhook`. For local development use an HTTPS tunnel to port 3000, and use its address for the webhook. Put its signing secret in `LEMON_SQUEEZY_WEBHOOK_SECRET`.
6. Subscribe to `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_payment_recovered`, `subscription_payment_refunded`, `order_created`, and `order_refunded`. Order events only refresh already-associated subscriptions; creation alone does not grant paid access. The handler validates HMAC-SHA256 against the raw body using the `X-Signature` header. [Webhook signing](https://docs.lemonsqueezy.com/help/webhooks/signing-requests), [event types](https://docs.lemonsqueezy.com/help/webhooks/event-types).
7. Restart the app. Run `npm run check:setup`. That command checks variable presence and syntax, not account validity. Open `/pricing`; checkout remains unavailable if the variants, store currency, amounts, trial, or setup fee do not match the plan.

Use the store's standard `STORE.lemonsqueezy.com` hosted checkout and billing domains. Custom payment domains are currently rejected by the payment-link allowlist. The customer portal is retrieved through the user's verified subscription; the browser cannot choose another customer's ID. Configure portal product switching so customers cannot switch into unrelated products or repeat the introductory variant. [Customer portal](https://docs.lemonsqueezy.com/help/online-store/customer-portal).

## Admin operations

At `/admin` → **Pricing plans**, enter the name, USD prices, trial duration, and both variant IDs. Create **new variants** in Lemon Squeezy before changing a published offer. The API supports retrieving products and variants; Folio validates existing variants and publishes an immutable application pricing version. It does not create products through an unsupported API or silently alter subscribers' prices. [Variants API](https://docs.lemonsqueezy.com/api/variants/the-variant-object).

A checkout stores a server-owned copy of its pricing terms. Existing subscriptions continue to use that copy after new pricing is published or environment IDs change. Do not alter the billing settings of variants already sold. Disable the introductory option in Folio if only monthly checkout should be offered.

Subscription actions cancel renewal, resume scheduled cancellation when the provider permits it, or stop renewal and immediately revoke Folio paid access. The latter revocation persists through subsequent webhooks. None of these actions refunds a payment. Some payment methods have provider restrictions on modification; the UI reports failure unless Lemon Squeezy confirms the requested state. Manage unsupported changes in the provider portal. [Subscription API](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription).

User deletion cancels mapped subscriptions before removing application data. Cleanup failures keep the account suspended and can be retried. Lemon Squeezy retains its billing history; this application does not delete provider customer records or issue refunds.

## Verification before launch

The automated tests use simulated provider responses and local PostgreSQL. Complete this connected **test-mode** checklist with your actual store; passing automated checks is not proof of a real checkout or renewal:

- Buy the introductory variant. Confirm $1 is paid today, the next charge is $25 after seven days, and access is limited to the paid introductory period until a monthly payment succeeds. Verify the setup fee is not charged again. Check the hosted checkout's displayed taxes and renewal terms before confirming.
- Buy monthly with a separate account. Confirm $25 today with no setup fee or trial, access after the signed event arrives, and the customer portal's invoices, payment method, cancellation, and return flow.
- Exercise failed/abandoned checkout, webhook redelivery, failed renewal, recovery, cancellation, expiry, and initial/renewal refunds. Confirm server download access and 1 GB storage follow verified payment state, while free accounts retain 100 MB and free tools.
- Check a second user cannot open the first user's portal. Confirm altered webhook signatures and mismatched store, mode, variant, customer, or checkout token cannot grant access.
- Test editor recovery across sign-in, checkout in another tab, refreshing the account, and returning to download. A checkout success URL by itself must not unlock a document.
- Publish a new pair of variants from admin; verify new purchases show the new terms while the earlier subscriber keeps the original terms. Exercise admin cancellation/resumption and deletion with a disposable test account.

For production, activate the store, use live variants/API credentials/webhook, and explicitly set `LEMON_SQUEEZY_TEST_MODE=false`. Test and live events are isolated. Do not switch environments on a production database containing active subscribers; use a separate database for test purchases.

## Operational behavior

Checkout links last 15 minutes. A second tab reuses a matching link. A different offer waits for the existing checkout and a two-minute delivery grace period to expire, avoiding overlapping payable links. API timeouts also retain the reservation because the provider may have created a link before the response was lost. Lemon Squeezy's checkout API has no expire endpoint, so the app cannot cancel an already-issued link. Pausing purchases stops new issuance; existing links retain their terms until expiry. Permanent deletion waits for uncompleted links plus a 30-minute webhook grace period. [Checkout API](https://docs.lemonsqueezy.com/api/checkouts/create-checkout).

Entitlements use canonical subscription, order, and invoice API data, never a client role, email match, posted price, success redirect, or webhook status alone. A random checkout token binds the subscription to the authenticated purchaser. Duplicate events are deduplicated in PostgreSQL; updates are ordered and immediate revocations cannot be undone by later events. The introductory setup payment only covers its configured days. Monthly paid coverage is capped by a calendar month from the latest qualifying payment and the canonical renewal/end date. Unpaid, paused, expired, refunded, or mismatched payments cannot grant a new paid period. Discounts, prorated plan changes, metered pricing, and adjustable quantities are not part of Folio's published offers.

Keep the webhook endpoint reachable during maintenance and monitor failed deliveries in Lemon Squeezy. Successful payment depends on webhook delivery to associate the subscription. Replay failed events after an outage. Payment disputes and refunds should be reviewed in Lemon Squeezy; do not assume a dispute necessarily emits a refund event. Revoke app access through admin when needed.

Internal `stripe_subscription_id` and `stripe_customer_id` column names remain in the older Supabase schema to preserve existing quota, storage, and audit functions. Active subscriptions use `lemon_` IDs; those names do not invoke Stripe or require its SDK. The new `lemon_checkouts` table and its functions are service-role only. No provider secrets are sent to the browser.
