# Super admin setup and operations

The dashboard is at `/admin`. Without configured accounts, it shows an explicit preview with no invented users or revenue. Administrative mutations remain disabled. No default administrator, password, email allowlist, or browser flag grants access.

## Connect the first administrator

1. Configure Supabase Google/email authentication and server credentials as described in [SETUP.md](SETUP.md).
2. Apply [001_billing.sql](../supabase/migrations/001_billing.sql), [002_paid_intro.sql](../supabase/migrations/002_paid_intro.sql), and [003_platform_admin.sql](../supabase/migrations/003_platform_admin.sql) in order. For an existing installation, apply only missing migrations. Migration 003 is required before starting this version with configured credentials.
3. Sign in once at `/account` with the Google account (or email link) you will use as administrator.
4. In your trusted Supabase SQL editor, replace the email below with that account’s email and run:

```sql
insert into public.super_admins(user_id)
select id from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL')
on conflict do nothing;
```

5. Confirm exactly the intended account is assigned, refresh its account access, and open `/admin`. The account page also displays a dashboard link for verified super admins. Test with a separate ordinary account: its `/api/admin` requests must return 403.

Provision additional administrators through the same trusted database process. To remove administrative access, delete only the intended `super_admins` row in the SQL editor. The dashboard cannot assign roles or suspend super admins, which prevents accidental self-lockout through its account controls. Membership changes take effect on the next server request.

Never ship the service role key to the browser. The API uses Supabase `getUser` to verify each bearer token, then checks database role membership. User profile metadata is not an administrative credential. All administration/support tables enable RLS and deny direct browser-role access; privileged SQL functions also validate the actor.

## Dashboard capabilities

| Screen        | Available actions                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | Real account counts, active paid subscriptions, paid trials, unresolved inquiries, Pro download attempts for today, suspended users, recent activity |
| Users         | Search by email/ID, paginate, suspend/restore, grant 1–365 days of courtesy Pro access, revoke courtesy access                                       |
| Subscriptions | Search/paginate, cancel at period end, resume scheduled renewal, end immediately                                                                     |
| Pricing plans | Change Pro name, USD monthly amount, paid introductory amount/duration, and offer availability; publish a new version                                |
| Support inbox | Read inquiries, reply in-app, change open/pending/resolved status and low/normal/high priority                                                       |
| Site settings | Maintenance mode/message, pause new purchases, site announcement                                                                                     |
| Activity log  | Paginated changes, actor IDs, reasons, operation details, pending/completed Stripe requests                                                          |

Account suspension blocks authenticated processing and new purchases. It does not cancel billing or delete saved documents. Support and billing-portal access remain available so suspended users can ask for help and cancel. Courtesy grants do not charge or cancel a subscription. Anonymous previews remain available because they do not require an account.

Ending a subscription immediately revokes paid access after the canonical Stripe update is synchronized. Scheduled cancellation retains access through the paid period. Courtesy access, if separately granted, can outlast the subscription; revoke it separately when appropriate. Cancellation does not issue a refund. Refunds and disputes are handled in Stripe; this dashboard does not provide refunds or automatic dispute revocation.

## Publishing pricing

The initial plan is **$1 USD for 7 days, then $25 USD/month**, with a direct **$25 USD/month** option. The plan editor supports USD only, monthly amounts from $1 to $1,000, introductory amounts from $0.50 to $1,000, and durations from 1 to 30 days. Disabling the introductory offer leaves direct monthly billing available.

Connect Stripe and webhook credentials before publishing. Review the amounts, renewal terms, and reason in the confirmation dialog. Publishing creates new Stripe prices; it does not charge anyone. The database atomically switches the active version and records the change. Existing subscriptions retain their previous Stripe price and introductory terms. The first publication pins configured initial price IDs in the database; do not delete old pricing versions.

The public pricing page, download dialog, and checkout use the current catalog. Checkout rejects a stale displayed version and asks the user to review the current terms. The introductory offer remains once per account across price versions. An already-created Stripe Checkout session retains its original terms, including after a price change or purchase pause; expire outstanding sessions in Stripe if required.

Stable request IDs bind retries to one administrator and one payload. Database version checks prevent overwriting another admin’s newer publication. Stripe and PostgreSQL cannot commit atomically: an interrupted publication may leave unused Stripe products/prices, and failed subscription synchronization should be retried using the same pending review. Inspect activity and Stripe records after a persistent error. Existing subscriptions are not bulk migrated by the dashboard.

## Maintenance and recovery

Maintenance returns HTTP 503 and `Retry-After: 300` for new public page and processing requests. It preserves access to `/admin`, `/account`, `/dashboard`, `/auth/*`, `/support`, `/api/admin`, `/api/account/*`, `/api/support`, `/api/billing/portal`, and `/api/billing/webhook`. Settings caches expire within three seconds per process. Already-open free tools can continue processing locally; server actions explain the temporary interruption.

To recover from an accidental maintenance setting when the dashboard is unavailable, use the trusted SQL editor:

```sql
update public.platform_settings
set maintenance = false, updated_at = now()
where id = true;
```

Pausing purchases does not stop subscription renewals, cancel subscriptions, or expire existing checkout sessions. Keep signed webhook delivery working during maintenance so payment state stays current.

## Inquiries and document recovery

Customers submit inquiries at `/support`. Signed-in inquiries use the verified account email. Anonymous inquiries can be viewed after signing in with the same verified email. Other users cannot read or reply to them. Admin replies appear in the support page; no email notification service is implemented. Support, subscription, and activity records need an operational retention/deletion policy before production use.

Free tools remain free, including downloads. Pro text editing supports anonymous inspection and bounded PNG previews; only modified PDF downloads and password-protected exports require paid or courtesy access. The anonymous API never returns edited user PDF bytes. The fixed application sample remains freely downloadable.

When a Pro text download opens the payment prompt, signed-in users save source bytes, inspection, and edits to private Supabase Storage (migration 005). Guests keep work in the open tab until sign-in; no new local recovery files are written. Sign-in and checkout open a new tab. Return to the original tab and choose “I’ve paid — download my PDF”; access is reverified before retrying the protected export. A success URL never grants access. Recovery removal is attempted after successful export or selection of another PDF; drafts older than seven days are not restored. Clearing site data does not delete cloud copies. Passwords are never stored in recovery drafts.

## Verification status and deployment

Automated tests exercise PostgreSQL role boundaries, courtesy/suspension rules, support ownership, pricing version conflicts, HTTP authorization, maintenance recovery, anonymous preview versus export gating, browser draft recovery, responsive layouts, and accessibility. Server-route tests use mocked Supabase transport over a real local PostgreSQL engine, and mocked Stripe SDK methods to verify publication retries and subscription synchronization. Real Google login, Supabase email delivery, Stripe checkout/webhooks, admin pricing publication, cancellation, and renewals still require the connected test-mode workflow in [BILLING.md](BILLING.md). No live payment or administrative change against a real service has been performed here.

This version uses synchronous bounded PDF workers and instance-level public request budgets. Before large-scale deployment, add distributed ingress abuse controls, isolated workers, queueing, monitoring, database query tuning, and measured capacity planning as described in [ARCHITECTURE.md](ARCHITECTURE.md). No million-user capacity claim is made.
