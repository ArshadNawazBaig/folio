# Customer dashboard and private PDFs

Customers land at `/dashboard` after sign-in. Verified super admins still land at `/admin`; they can open their personal workspace at `/dashboard`. A requested billing or file tab survives Google/email sign-in. Dashboard pages and APIs are private, uncached, and marked `noindex`.

## Enable cloud storage

1. Keep the existing Supabase URL, publishable key, and server secret in `.env`. No additional environment variables are needed.
2. Apply any missing migrations 001–003 first. In your project's **Supabase → SQL Editor**, run [004_cloud_documents.sql](../supabase/migrations/004_cloud_documents.sql), then [005_cloud_recovery.sql](../supabase/migrations/005_cloud_recovery.sql), and [006_editor_autosave.sql](../supabase/migrations/006_editor_autosave.sql). Apply only missing migrations.
3. Confirm that **Storage → folio-documents** and **folio-recovery** exist and are **private**. The migration creates the bucket, metadata table, upload reservations, and ownership policies.
4. Restart the app if environment values changed. Sign in, open **My files**, and upload a small PDF. Reload and sign into the same account in another browser to verify it appears there. Another account must not see or download it.

The migration is supplied locally; it is not automatically applied to your remote database. If missing, the dashboard reports that cloud storage is unavailable while billing and account settings remain accessible.

## File behavior

- **Cloud files:** upload, search, sort, rename, open in the editor, download, and permanently delete. Each account gets 500 MB, up to 200 files, with a 50 MB per-file limit. These limits are declared in both the SQL reservation function and `src/lib/cloud-types.ts`; change them together.
- **Automatic editor saving:** opening a PDF uploads its source once. The editor then saves each document’s annotations, original-text edits, forms, page order, and current page without creating PDF copies. Refreshing `/workspace?cloud=ID` restores that workspace. “Save now” and Ctrl/Cmd+S flush pending edits immediately. Wait for “All changes saved”; an unfinished upload or pending edit is not yet recoverable. The source and state remain separate so unpaid original-text changes cannot bypass the paid export endpoint. Dashboard downloads render the saved state; premium changes open the download prompt in the editor.
- **Guests:** private workspaces use an HttpOnly, SameSite cookie and expire after 24 hours. They do not require Supabase anonymous sign-in. A valid signed-in account can claim its current guest workspace before expiry; claimed files appear in My files and no longer expire. Guest storage is bounded to 100 MB and four files, with pending uploads reserving 50 MB each. Clearing the cookie loses guest access.
- **Saved state:** each workspace supports up to 8 MB of edit instructions and added image data. State counts toward account storage. Updates use a revision check and idempotent write IDs: another tab cannot silently overwrite newer edits, and retrying a lost save response does not create a second revision. Failed saves remain visible with Retry saving. No new document content is written to browser storage; the page URL identifies the document.
- **Older drafts:** a migration section appears only if earlier browser drafts exist. Users review and move their own drafts to cloud storage; browser copies are removed only after successful uploads. Older checkout recovery drafts can also be moved while still valid. No new document content is written to IndexedDB. `/documents` now redirects to the cloud library.
- Failed uploads appear as incomplete entries when cleanup cannot finish. **Finish upload** retries verification after a successful transfer; **Delete** removes incomplete entries. Uploads reserve 50 MB until verified, so at least 50 MB of free capacity is needed to start one. Reservations are never automatically discarded while an object might still exist.

Editor uploads use a server-authorized signed upload URL and travel directly from the browser to private Supabase Storage. Account-library uploads retain the authenticated direct upload flow. Standard uploads are bounded at 50 MB; automatic resumable uploads are not implemented. Interrupted transfers can be retried. Workspace reads require the owning account or unexpired guest cookie and return a source URL valid for 60 seconds. There are no permanent public file URLs.

Account APIs verify the bearer token and scope metadata operations to that user. Workspace APIs also accept an unexpired guest session, check same-origin requests, and hash the opaque cookie before looking up ownership. The bucket also enforces ownership and suspension through restrictive RLS policies. Client roles cannot modify metadata, overwrite ready objects, or delete objects directly. Server deletion marks the file unavailable, removes its Storage object, then removes metadata; a Storage failure leaves a retryable record. Before deleting an auth user administratively, remove their Storage objects through the Storage API; metadata cascade alone does not remove object bytes. Periodic reconciliation of stale uploads and orphaned objects is recommended for production operations; never delete `storage.objects` rows directly as an object-cleanup mechanism.

## Billing and profile

**Billing & plan** shows verified access, paid coverage, introductory/cancellation information, and payment issues. **Manage billing** opens the existing customer's Stripe portal for invoices, payment methods, and subscription changes. Checkout success and portal return now land on the billing tab. Enable the intended payment-method, invoice, and cancellation features in your Stripe customer portal settings; existing Stripe setup and webhooks are still required. See [BILLING.md](BILLING.md).

**Account settings** saves the full name and optional company to Supabase user metadata. These values never grant permissions. Email is read-only. Users can end other refresh sessions while retaining this browser; existing access tokens on those devices remain valid until expiry. Account deletion requests go through support.

**Help & support** uses the existing account-owned inquiry threads and replies. No notification emails are sent. Billing, profile, and support routes remain reachable during maintenance.

## Verification

`npm test` covers the SQL ownership policies, quotas, API ownership, upload-size verification, and retryable deletion against isolated PostgreSQL fixtures. `npm run test:auth` runs Google PKCE, dashboard navigation, file operations with real sample PDF bytes, profile persistence, session controls, responsive layouts, and accessibility using simulated service responses on port 3001. It never uses real customer credentials or payment providers. A live Supabase upload and Stripe portal session still need the connected setup above.

## Cloud checkout recovery

Migration 005 creates the private `folio-recovery` bucket. Each signed-in account has five fixed recovery slots (PDF text editing, translation, and the three Office converters), each bounded to 40 MB. The bucket uses ownership and suspension policies even if another bucket has broad policies. JSON transfers go directly to Supabase with the user JWT. Recovery slots are separate from the 500 MB PDF-library allowance and can occupy at most 200 MB per account.

PDF text recovery stores source bytes plus edit instructions, and main-editor workspaces also include annotations, page order, and form values; translated/converted recovery stores the existing encrypted artifact and preview. Recovery storage never grants Pro download rights. Pro drafts expire logically after seven days, prepared output after 24 hours; reopening the matching tool restores valid cloud work. Standalone tools attempt to clear their matching recovery slot after a successful download or choosing another file. Existing main-editor recovery drafts can be opened and imported into the new per-document autosave flow. Slots are overwritten by subsequent drafts; configure periodic operator cleanup for expired objects and failed deletions. There is no automatic server cleanup job.

Guest editing remains available. Until sign-in, work stays in the open tab and cannot recover after a reload. At an open checkout prompt, returning from sign-in starts cloud recovery saving. The prompt reports success only after the upload succeeds and otherwise asks users to keep the tab open. Passwords are kept only in memory.

## Guest cleanup and deployment

Apply migration 006 using the Supabase SQL Editor before using autosave. Existing Supabase environment variables are sufficient; there is no new secret. API request-body limits must permit saved state up to 8 MB plus JSON overhead. PDF bytes use direct Storage uploads and do not cross the Next.js upload body boundary.

Schedule `node scripts/cleanup-guest-workspaces.mjs` at least hourly in the deployment environment. It removes up to 100 expired guest objects per run using the Storage API, then deletes their metadata and snapshots. Guest access ends at 24 hours; physical cleanup uses a two-hour grace period because previously issued upload tokens may remain valid. Failed removals retain a retryable row. The job does not remove account-owned files and has not been scheduled by the local application. Anonymous upload creation also has an instance request budget; production needs an ingress rate limit for distributed deployments.
