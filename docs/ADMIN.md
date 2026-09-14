# Super admin setup and operations

The dashboard is at `/admin`. Without configured accounts, it shows an explicit preview with no invented users or revenue. Administrative mutations remain disabled. No default administrator, password, email allowlist, or browser flag grants access.

## Connect the first administrator

1. Configure Supabase Google/email authentication and server credentials as described in [SETUP.md](SETUP.md).
2. Apply migrations 001–010 in order as described in [SETUP.md](SETUP.md). For an existing installation, apply only missing migrations. Migration 003 enables administration; [007_admin_user_deletion.sql](../supabase/migrations/007_admin_user_deletion.sql) adds permanent user deletion after the storage migrations, and [008_plan_storage_limits.sql](../supabase/migrations/008_plan_storage_limits.sql) adds account storage quotas. [009_blog.sql](../supabase/migrations/009_blog.sql) enables the blog workspace at `/admin/blog`; see [BLOG.md](BLOG.md). [010_lemon_squeezy.sql](../supabase/migrations/010_lemon_squeezy.sql) enables Lemon Squeezy checkout and subscription binding. Applying these migrations does not delete existing users or files.
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
| Activity log  | Paginated changes, actor IDs, reasons, operation details, pending/completed Lemon Squeezy requests                                                   |

Account suspension blocks authenticated processing and new purchases. It does not cancel billing or delete saved documents. Support and billing-portal access remain available so suspended users can ask for help and cancel. Courtesy grants do not charge or cancel a subscription. Anonymous previews remain available because they do not require an account.

**Activate** restores a suspended user's account access without changing billing. It does not create or verify an identity: users still sign in through the configured Google/email authentication flow.

## Deleting a user and their data

Open **Users → Delete user**, check the account shown, enter `DELETE`, and provide a reason. The server verifies super admin membership on every request and rejects deletion of yourself or any other super admin, even if the browser request is modified.

Deletion first suspends the account and blocks new uploads, reactivation and checkout writes. It cancels mapped Lemon Squeezy subscriptions, removes stored PDFs and recovery drafts through the Storage API, and hard-deletes the Supabase identity. Database cascades remove the user’s application billing, support, quota, and workspace records. Cleanup failures keep the account suspended for a retry.

Lemon Squeezy retains historical payment records; Folio does not delete its customer records or issue refunds. Connected Lemon Squeezy credentials are required to verify cancellation before deleting an account with subscriptions. Uncompleted checkout links must expire before deletion. See [BILLING.md](BILLING.md).

If billing, storage or Auth cleanup fails, the dashboard reports the failure and shows **Deletion pending → Retry deletion**. The account stays suspended and cannot be activated once permanent deletion starts. Retry after resolving the service error; already completed steps are safe to repeat. An active checkout creation briefly prevents deletion so its customer mapping can finish. Never manually remove Storage SQL rows to bypass a failure: Supabase requires owned files to be removed before deleting their user. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

A minimal deletion record retains the account UUID, requesting administrator, timestamps and reason. It contains no document contents or profile. Completion is recorded in the same database transaction as Auth removal. Recovery policies reject a deleted account's old JWT, and ordinary app APIs verify the current Auth identity. Deletion does not remove copies already downloaded, third-party infrastructure logs or database backups.

Until migration 007 is applied in **Supabase → SQL Editor**, the dashboard keeps Delete user disabled and displays setup instructions. Existing Activate/Suspend controls continue working. No additional environment variables are needed.

Ending access immediately cancels renewal and persistently revokes application paid access. Scheduled cancellation retains access through the paid period. Courtesy grants are separate. Refunds are managed in Lemon Squeezy; supported refund webhooks update paid coverage.

## Publishing pricing

The initial plan is **$1 USD for 7 days, then $25 USD/month**, with a direct **$25 USD/month** option. The plan editor supports USD only, monthly amounts from $1 to $1,000, introductory amounts from $0.50 to $1,000, and durations from 1 to 30 days. Disabling the introductory offer leaves direct monthly billing available.

Connect Lemon Squeezy and its webhook before publishing. Create new subscription variants in Lemon Squeezy, then enter their numeric IDs and matching amounts/trial terms in Folio. Publication validates provider settings and atomically selects a new pricing version. Existing checkout term snapshots remain unchanged.

The public pricing page, download dialog, and checkout use the current catalog. Stale versions are rejected at checkout. Introductory eligibility is once per account. Existing checkout links remain payable until expiry even if new purchases are paused.

Stable request IDs bind retries to the administrator and payload. Database version checks prevent stale pricing publications. Provider changes and database writes are separate operations: retry synchronization after transient failures and inspect the audit log. Existing subscribers are never automatically moved to a new variant.

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

Automated tests cover PostgreSQL role boundaries, admin operations, support ownership, document access, maintenance, deletion retries, and Lemon Squeezy billing with simulated transport. Real checkout, renewals, and portal actions require the connected test-mode workflow in [BILLING.md](BILLING.md). No real users or payments are used by these tests.

This version uses synchronous bounded PDF workers and instance-level public request budgets. Before large-scale deployment, add distributed ingress abuse controls, isolated workers, queueing, monitoring, database query tuning, and measured capacity planning as described in [ARCHITECTURE.md](ARCHITECTURE.md). No million-user capacity claim is made.
