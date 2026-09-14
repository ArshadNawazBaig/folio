# Super admin setup and operations

The dashboard is at `/admin`. Without configured accounts, it shows an explicit preview with no invented users or revenue. Administrative mutations remain disabled. No default administrator, password, email allowlist, or browser flag grants access.

## Connect the first administrator

1. Configure Supabase Google/email authentication and server credentials as described in [SETUP.md](SETUP.md).
2. Apply migrations 001–009 in order as described in [SETUP.md](SETUP.md). For an existing installation, apply only missing migrations. Migration 003 enables administration; [007_admin_user_deletion.sql](../supabase/migrations/007_admin_user_deletion.sql) adds permanent user deletion after the storage migrations, and [008_plan_storage_limits.sql](../supabase/migrations/008_plan_storage_limits.sql) adds account storage quotas. [009_blog.sql](../supabase/migrations/009_blog.sql) enables the blog workspace at `/admin/blog`; see [BLOG.md](BLOG.md). Applying these migrations does not delete existing users or files.
3. Sign in once at `/account` with the Google account (or email link) you will use as administrator.
4. In your trusted Supabase SQL editor, replace the email below with that account’s email and run:

```sql
insert into public.super_admins(user_id)
select id from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL')
on conflict do nothing;
```

5. Confirm exactly the intended account is assigned, refresh its account access, and open `/admin`. The account page also displays a dashboard link for verified super admins. Test with a separate ordinary account: its `/api/admin` requests must return 403.

Provision additional administrators through the same trusted database process. To remove administrative access, delete only the intended `super_admins` row in the SQL editor. The dashboard cannot assign roles, suspend super admins, or delete super admins. Membership changes take effect on the next server request.

Never ship the service role key to the browser. The API uses Supabase `getUser` to verify each bearer token, then checks database role membership. User profile metadata is not an administrative credential. All administration/support tables enable RLS and deny direct browser-role access; privileged SQL functions also validate the actor.

## Dashboard capabilities

| Screen        | Available actions                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | Real account counts, active paid subscriptions, paid trials, unresolved inquiries, Pro download attempts for today, suspended users, recent activity |
| Users         | Search by email/ID, paginate, activate/suspend, permanently delete users and their data, grant/revoke courtesy Pro access                            |
| Subscriptions | Search/paginate, cancel at period end, resume scheduled renewal, end immediately                                                                     |
| Pricing plans | Change Pro name, USD monthly amount, paid introductory amount/duration, and offer availability; publish a new version                                |
| Support inbox | Read inquiries, reply in-app, change open/pending/resolved status and low/normal/high priority                                                       |
| Site settings | Maintenance mode/message, pause new purchases, site announcement                                                                                     |
| Activity log  | Paginated changes, actor IDs, reasons, operation details, pending/completed Stripe requests                                                          |

Account suspension blocks authenticated processing and new purchases. It does not cancel billing or delete saved documents. Support and billing-portal access remain available so suspended users can ask for help and cancel. Courtesy grants do not charge or cancel a subscription. Anonymous previews remain available because they do not require an account.

**Activate** restores a suspended user's account access without changing billing. It does not create or verify an identity: users still sign in through the configured Google/email authentication flow.

## Deleting a user and their data

Open **Users → Delete user**, check the account shown, enter `DELETE`, and provide a reason. The server verifies super admin membership on every request and rejects deletion of yourself or any other super admin, even if the browser request is modified.

Deletion first suspends the account and blocks new uploads, reactivation and checkout writes. It then removes the linked Stripe customer, deletes stored PDFs and recovery drafts through the Storage API, and hard-deletes the Supabase login identity. The database removes document metadata/editor snapshots, account settings, usage, grants, billing mappings/subscriptions, support conversations, and related activity entries. Claimed guest documents and orphaned uploads under the account's folder are included; unrelated guest sessions cannot be attributed to this user and retain their normal expiry.

Stripe customer deletion cancels its active subscriptions. Stripe retains historical payment records and this action does not issue refunds. A configured `STRIPE_SECRET_KEY` is required for accounts with a Stripe customer. [Stripe customer deletion](https://docs.stripe.com/api/customers/delete?lang=node).

If billing, storage or Auth cleanup fails, the dashboard reports the failure and shows **Deletion pending → Retry deletion**. The account stays suspended and cannot be activated once permanent deletion starts. Retry after resolving the service error; already completed steps are safe to repeat. An active checkout creation briefly prevents deletion so its customer mapping can finish. Never manually remove Storage SQL rows to bypass a failure: Supabase requires owned files to be removed before deleting their user. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

A minimal deletion record retains the account UUID, requesting administrator, timestamps and reason. It contains no document contents or profile. Completion is recorded in the same database transaction as Auth removal. Recovery policies reject a deleted account's old JWT, and ordinary app APIs verify the current Auth identity. Deletion does not remove copies already downloaded, third-party infrastructure logs or database backups.

Until migration 007 is applied in **Supabase → SQL Editor**, the dashboard keeps Delete user disabled and displays setup instructions. Existing Activate/Suspend controls continue working. No additional environment variables are needed.

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

Automated tests exercise PostgreSQL role boundaries, activation/suspension, deletion authorization and confirmations, complete data removal, cross-account isolation, retries after billing/storage/Auth failures, stale JWT rejection, support ownership, pricing version conflicts, HTTP authorization, maintenance recovery, anonymous preview versus export gating, browser draft recovery, responsive layouts, and accessibility. Server-route tests use mocked Supabase transport over a real local PostgreSQL engine, and mocked Stripe SDK methods to verify publication retries, subscription synchronization and customer deletion. Real Google login, Supabase email delivery, Stripe checkout/webhooks, admin pricing publication, cancellation, and renewals still require the connected test-mode workflow in [BILLING.md](BILLING.md). No real users were deleted to test this feature.

This version uses synchronous bounded PDF workers and instance-level public request budgets. Before large-scale deployment, add distributed ingress abuse controls, isolated workers, queueing, monitoring, database query tuning, and measured capacity planning as described in [ARCHITECTURE.md](ARCHITECTURE.md). No million-user capacity claim is made.
