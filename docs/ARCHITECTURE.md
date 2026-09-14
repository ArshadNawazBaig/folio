# Current architecture and the path to cloud services

## Implemented now

Next.js serves prerendered local tool pages, dynamic server-rendered service availability and pricing and a client editor shell. Files enter through the browser File API. PDF.js renders pages using a local worker; pdf-lib handles mutations in a separate worker. JPG/PNG and text exports use PDF.js, and multi-file downloads use JSZip. File-size, page-count, and raster-dimension limits constrain local memory usage.

The editor stores one active source document plus editing history in memory. Saving uploads an edited PDF copy to the private account library. Existing IndexedDB drafts are read only for explicit migration, then removed after a successful upload. New local file saves are disabled. Signed-in checkout recovery uses private Supabase Storage with one bounded slot per tool. Main-editor guest workspaces are stored in private cloud storage with versioned edit instructions and a 24-hour expiry; they can be managed in the guest dashboard with a 100 MB allowance. Standalone-tool guest work remains in the current tab until sign-in.

Folio Pro adds Supabase Google and email-link accounts, PostgreSQL billing state and atomic usage quotas, Lemon Squeezy Checkout/portal/webhooks, and two Node processing tools. Original text editing replaces supported text objects through PDFium; password protection produces an AES-256 encrypted PDF. Text inspection and bounded PNG previews accept anonymous user uploads. Edited/encrypted PDF exports require a verified account and an unexpired paid subscription or admin-issued courtesy grant. No modified user PDF bytes are returned by the anonymous preview API. The initial introduction costs $1 USD for 7 days and renews at $25 USD/month; direct monthly subscriptions start at $25. Admin pricing publication creates immutable versions so previous subscriptions retain their terms. Client flags, free trials, and checkout redirects cannot grant access. See [BILLING.md](BILLING.md) for setup and operational limits.

The paid UI previews a selected PDF locally before the user explicitly sends it for text inspection or password protection. PDF bytes and passwords are processed in memory in a short-lived child process and returned to the browser. They are not persisted in PostgreSQL or object storage. A separate public demo accepts only the server's fixed sample. The web application still needs host-level process isolation and ingress limits for public deployment.

No account/payment credentials have been connected in this workspace, so checkout and live administration are disabled; anonymous user-file editing and previews work. Google Cloud PDF translation and ConvertAPI Office conversion are implemented but require service credentials. Anonymous preparation returns results encrypted with authenticated encryption and image previews; paid export decrypts only after server entitlement checks. Encrypted recovery copies expire after 24 hours. Tool pages describe these limits rather than implying that all advertised workflows already have a backend.

## Administration and operations

Every admin API request verifies the Supabase user token and a database `super_admins` record. Database functions independently verify the actor, run with invoker privileges, and are executable only by the server service role. Browser roles cannot read or write administration, billing, or support tables. UI metadata and browser storage never grant administrative access.

The dashboard offers paginated user/subscription directories, suspension, courtesy grants, cancellation/resumption, pricing versions, site settings, and support conversations. Admin changes use payload-bound request IDs and an expected-version check. Lemon Squeezy variants are created in its dashboard and verified before Folio publishes a plan. Retry failed subscription synchronization from the pending admin review. See [BILLING.md](BILLING.md) for payment and webhook behavior.

Next.js Proxy applies maintenance to new page and API requests with HTTP 503 and Retry-After, while allowing admin recovery, account/auth, support, the billing portal, and signed webhooks. Already-loaded local free tools can keep working. Site settings are cached for up to three seconds per process; checkout rechecks the catalog. Configured settings failures fail closed for public service requests while recovery routes remain reachable.

Support ownership is checked against the authenticated user or verified matching email for anonymous inquiries. Replies are in-app only. Support and audit records currently have no retention job. Global instance budgets bound public preview/support requests but are not per-user abuse protection: a distributed rate limiter, bot controls, worker isolation, database monitoring, and capacity measurements are needed before exposing this to large traffic. Database directory searches currently use bounded result pages with exact counts; million-user deployments need measured query/index tuning or a search index.

## Proposed extension, not yet implemented

1. Extend the implemented managed PostgreSQL account/billing schema with document ownership and job records. Use connection pooling, indexed ownership queries, and bounded pagination.
2. Extend the private Supabase library with resumable transfers, background cleanup, and lifecycle rules before connecting it to processing queues. Keep PDF payloads off the Next.js request path; retain ownership and completed-upload validation at each boundary.
3. Separate temporary processing objects from explicitly saved documents. Define retention, deletion, quotas, and backup behavior before enabling uploads. Provider lifecycle deletion is eventual, so strict deletion deadlines need a reconciled deletion job.
4. Introduce a durable job queue with job IDs, idempotency keys, bounded retries, backoff, cancellation, and a dead-letter queue. Deduplicate at-least-once deliveries. Track per-job progress and final object ownership in the database.
5. Run conversion/OCR in isolated, resource-limited containers with timeouts. Scale according to backlog, processing latency, and measured resource consumption, with spending caps. Untrusted documents should not share filesystem access with the web application.
6. Connect and verify the implemented translation and Office providers ([SETUP.md](SETUP.md)). Publish actual languages, page and size limits, pricing, third-party processing, and layout fidelity. Preview changes and handle expanded text, RTL scripts, and font coverage. Test real scanned, table-heavy, and multilingual documents before calling it ready.
7. Add reliable monitoring for job success rate, queue age, request latency, storage growth, and cost per completed document. Design billing entitlements and quotas around measured workloads.

Start with a modest deployment and scale from measurements. One million registered accounts, one million monthly active users, and one million simultaneous document-processing sessions imply different capacity requirements. The current project does not claim tested capacity for any of those production loads.

## Private account library

The customer dashboard uses Supabase private Storage for explicit PDF saves and uploads. Metadata lives in `cloud_documents`; every API verifies the user and scopes queries to their ID. Direct browser transfers use the user JWT with bucket RLS. An atomic reservation function enforces account capacity, and completion checks object size/type before exposing it. There are no public download URLs. Older browser drafts can be explicitly moved as PDF copies; no new browser drafts are written. See [DASHBOARD.md](DASHBOARD.md) for migration 004, lifecycle limits, and production cleanup considerations.
