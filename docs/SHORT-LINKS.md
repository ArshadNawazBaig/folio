# URL shortener

The public tool is `/url-shortener`; account management is `/dashboard?view=links`.
Shared links use `${NEXT_PUBLIC_SITE_URL}/s/{alias}`. PNG and SVG QR codes encode that short URL.
There are no new dependencies, subscription prices, external URL-fetching services, or QR services.

## Setup

Apply `supabase/migrations/013_short_links.sql` after migrations 001–012 before deploying the application changes. Set `NEXT_PUBLIC_SITE_URL` to the stable public HTTPS origin; changing it later changes newly displayed short URLs and QR codes. Keep old domains serving `/s/` redirects when changing domains. This migration adds private tables and service-role RPCs and does not alter existing files or billing records.

## Plans

| Feature                                | Free     | Pro (including active trial and courtesy access) |
| -------------------------------------- | -------- | ------------------------------------------------ |
| Saved links                            | 10       | 1,000                                            |
| Random aliases, titles, copy, deletion | Included | Included                                         |
| PNG/SVG QR downloads                   | Included | Included                                         |
| Custom aliases                         | —        | Included                                         |
| Destination editing                    | —        | Included                                         |

Sign-in is required. Existing links, including custom aliases, continue to redirect after downgrade. All accounts may rename or delete their own links. A downgraded account above its allowance must delete enough links or renew Pro before creating another.

Creation is limited to 20 successful links per minute and 100 per UTC day on Free or 1,000 on Pro. Failed attempts do not consume the counter; deletion does not reset it. Saved-link counts and creation counters are serialized per account inside PostgreSQL. Unique aliases are reserved atomically across accounts. Deleted aliases are never recycled, including after account deletion, to protect already shared URLs and QR codes. Only the alias reservation survives deletion, without its title, destination, or owner.

Listings and writes require a verified bearer token. Direct anonymous/authenticated database access is revoked and RLS is enabled; the server scopes all management to the verified account. Custom-alias and destination-edit entitlements are checked inside database functions against paid access, including revocation and expiry. Public redirects disclose only a destination, ignore untrusted query parameters, use uncached 302 responses, and stay reachable during site maintenance. Deleted, missing, suspended, or deleting-account links return 404. A backend outage returns 503. No click analytics are collected.

HTTP(S) destinations only; no embedded credentials or Folio short-link chains on the configured origin. Folio never fetches the destination server-side. Alias rules: 3–48 lowercase ASCII letters, digits, and hyphens, with alphanumeric ends. Blank aliases receive a cryptographically random 12-character code. Aliases cannot be edited. QR downloads use the existing local QR library with high error correction.

Verify with `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and the short-links browser suite in `npm run test:auth`.
