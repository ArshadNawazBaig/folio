# Custom domain: thebestfreepdf.com

Preferred public origin: `https://thebestfreepdf.com`.

Source repository: [ArshadNawazBaig/folio](https://github.com/ArshadNawazBaig/folio), branch `main`. The `erushbaig` collaborator account has push access. The local checkout uses that account for GitHub authentication and new commits; existing commit authorship is preserved.

## Direct Railway domain — October 4, 2026

The owner requested the same setup as `messivsronaldo17.com`. That domain uses
Vercel nameservers, an apex ALIAS pointing to Railway, and Railway's domain
verification TXT record.

`thebestfreepdf.com` is now registered as a custom domain on Railway's `folio`
production service, targeting port `3000`. Its Railway domain ID is
`2ba0312b-77b5-4ccc-a444-1f10555ce31d` and routing target is
`lrtso5oo.up.railway.app`.

The Vercel DNS zone contains these records:

| Name | Type | Purpose or target |
| --- | --- | --- |
| `@` | ALIAS | `lrtso5oo.up.railway.app` |
| `_railway-verify` | TXT | Railway's verification value for this custom domain |
| `@` | TXT | Existing Google site verification, copied from GoDaddy DNS |
| `_dmarc` | TXT | Existing DMARC policy, copied unchanged |
| `_domainconnect` | CNAME | `_domainconnect.gd.domaincontrol.com.` |
| `www` | CNAME | `a8eb7bd5ce318416.vercel-dns-017.com.`; retains the existing redirect to the root domain |

Both `ns1.vercel-dns.com` and `ns2.vercel-dns.com` were queried directly: the apex
resolves to Railway, both verification TXT records are present, and the existing
DMARC and `www` records match GoDaddy. No MX or AAAA records were returned for the
root, and no DNSSEC DS record was found at the time of preparation.

The owner changed the nameservers in GoDaddy to `ns1.vercel-dns.com` and
`ns2.vercel-dns.com`. The `.com` registry confirms the new delegation, and Railway
has verified domain ownership. Domain registration stays at GoDaddy; DNS
management is now at Vercel.

Railway is issuing the HTTPS certificate. Recursive DNS caches may temporarily
retain the former GoDaddy nameservers or Vercel proxy address. Keep the existing
proxy active for those cached requests. The `www` redirect has been verified
with path and query preservation. After certificate issuance, verify the direct
Railway connection, public canonical URL and indexing headers, and a PDF download.
Do not replace the ALIAS with a fixed Railway IP address.

```sh
npx @railway/cli domain status thebestfreepdf.com --service folio --environment production --json
dig +short NS thebestfreepdf.com
curl -I https://thebestfreepdf.com
```

## Previous proxy route and migration fallback — October 4, 2026

Railway project: [folio](https://railway.com/project/aa399ba8-748d-454b-8f5f-24a83d0075cc).
Service: `folio`, environment: `production`, port: `3000`.
Application origin: `https://folio-production-7dd2.up.railway.app`.

The public address remains `https://thebestfreepdf.com`. Before the nameserver
change, GoDaddy managed DNS through `ns11.domaincontrol.com` and
`ns12.domaincontrol.com`, with records pointing to Vercel. Requests that still
reach that address use this fallback: Vercel terminates HTTPS and forwards requests to Railway
using the project-level routing rule **Folio Railway origin**. Railway runs the
application and PDF workers. Keep the Vercel project and domain connection active.

The routing rule matches the exact host `thebestfreepdf.com` and regex path `^/(.*)$`,
rewrites to `https://folio-production-7dd2.up.railway.app/$1`, and sets the
request header `x-folio-public-host=thebestfreepdf.com`. The application uses that
header only to distinguish public-domain indexing from direct Railway alias
requests. It is not an authentication or authorization header.

Railway's production variables are
`NEXT_PUBLIC_SITE_URL=https://thebestfreepdf.com` and `NEXT_PUBLIC_INDEXABLE=true`.
The public domain keeps indexable metadata; the Railway alias receives a
`noindex` header. `www` continues to redirect to the root domain with paths and
queries preserved. The Vercel routing rule is restricted to the public root host,
so legacy Vercel sessions and preview deployments keep their existing behavior.

[Vercel external rewrites](https://vercel.com/docs/routing/rewrites) preserve the
browser URL and proxy requests to the external origin. The proxy has a
[120-second request timeout](https://vercel.com/docs/limits#proxied-request-timeout).
The current PDF worker timeout is 30 seconds; longer future jobs will need
background processing or another ingress arrangement.

The Supabase callback check accepts `https://thebestfreepdf.com/auth/callback`.
The existing Lemon Squeezy webhook already uses this domain. Billing remains in
test mode. Keeping this origin preserves the browser's existing account and guest
cookies when requests move to Railway.

Verification passed on the live root domain: valid HTTPS, Railway response
headers, correct canonical metadata, a 6 MB PDF upload, server PDF previews,
browser PDF merging and a six-page download, secure HttpOnly guest cookies, and
`www` path/query preservation. Direct Railway requests remain `noindex`.
The active rule matches only the root hostname; no test-header condition remains.

Manage or roll back the domain routing from the linked workspace:

```sh
npx vercel routes inspect 'Folio Railway origin'
npx vercel routes disable 'Folio Railway origin' --yes
npx vercel routes publish --yes
```

Disabling and publishing this rule restores the Vercel application for requests
that reach the old proxy address; it does not change the new Railway DNS route.
Deploy application updates to Railway with
`npx @railway/cli up --service folio`.

## Domain migration — September 17, 2026

- The apex domain serves Folio over HTTPS. Vercel reports DNS configured with no conflicts.
- `www.thebestfreepdf.com` permanently redirects to the apex with HTTP 308, preserving paths and query strings.
- `NEXT_PUBLIC_SITE_URL=https://thebestfreepdf.com` is configured for the Vercel project. Production indexing remains enabled; preview and local development stay noindex.
- Canonical URLs, sitemap entries, robots sitemap/host directives, Open Graph images/URLs, structured-data URLs, and new checkout return/receipt links derive from that site URL.
- The existing Lemon Squeezy test webhook was updated in place to `https://thebestfreepdf.com/api/billing/webhook`. Its events, secret, and test mode were not changed.
- Public requests to `folio-pdf-kappa.vercel.app` permanently redirect to matching new paths. The old workspace, documents, account, dashboard, admin, support, authentication and API paths remain reachable for existing browser sessions; those private routes stay noindex. Static editor assets also remain available.
- Local `.env` and `.env.example` retain `http://localhost:3000` for development. Do not replace local/test origins or Supabase/Google/Lemon Squeezy service endpoints with the public site domain.

## Required Supabase configuration

The session can deploy to Vercel and configure Lemon Squeezy, but has no Supabase Management API or project-settings access. The owner reported updating both settings. A subsequent live OAuth cancellation check (including PKCE) still sent the new callback to the old Site URL, while the old callback was accepted. The production browser bundle was verified to use project `ovdbyliabryjvnjfcfie`; the exact settings for that project need confirmation.

In [Supabase Authentication → URL Configuration](https://supabase.com/dashboard/project/ovdbyliabryjvnjfcfie/auth/url-configuration):

1. Set **Site URL** to `https://thebestfreepdf.com`.
2. Add **Redirect URL** `https://thebestfreepdf.com/auth/callback**`. The suffix includes the application's callback query parameters.
3. Keep the existing localhost and `https://folio-pdf-kappa.vercel.app/auth/callback**` entries during migration.
4. Save, then check Google sign-in on the new domain and return to the editor with the document intact.

Google's authorized provider redirect URI remains the Supabase callback at `https://ovdbyliabryjvnjfcfie.supabase.co/auth/v1/callback`. This is separate from the application's redirect URL.

Guest cookies and OAuth state are bound to their original domain. A redirect does not transfer them. Existing guest files can still be opened at `https://folio-pdf-kappa.vercel.app/dashboard`; sign in on that origin to keep those files in the account, then sign in on the new domain to access them. Do not add a blanket Vercel-host redirect while those sessions need recovery.

## Verification

Deployed as `dpl_FxE9XR4CyT9KuGtzqpEMwvGQKoAX` on September 17, 2026.

- Live SEO audit: **49 public sitemap URLs, zero issues**. The apex no longer receives a noindex header.
- Verified HTTP 308 redirects for the old public origin and `www`, including query values and sitemap/robots routes. Private legacy routes remain HTTP 200 with noindex headers. Deployment aliases remain noindex.
- Live guest upload, original/added text editing, cloud save, refresh recovery and continued editing passed on the new origin. The synthetic document was deleted afterward. QR, watermark and PNG smoke checks also passed without uncaught browser errors.
- The updated webhook endpoint rejects unsigned requests with HTTP 400. No purchase, customer change, or real payment event was submitted during these checks.
- Six focused domain/SEO unit tests, lint, TypeScript and production builds passed.
- A separate scan of all 49 public pages checked 5,338 URL-bearing HTML attributes and structured data: no links to the old public host remained.
- Full Google sign-in remains pending the Supabase settings above; the OAuth cancellation check did not create an account or send an email.

Repeat the public audit with:

```sh
npm run seo:audit -- https://thebestfreepdf.com /tmp/folio-domain-seo.json
```

Check public pages have canonical metadata for the new origin and no `X-Robots-Tag: noindex` header. Private routes and deployment aliases must remain noindex. Check both new and legacy paths, the `www` redirect, guest upload/save/refresh, and checkout return URLs. Domain redirect tests cover path/query preservation, private sessions, callbacks, assets, preview isolation, and the absence of redirect loops.

## Search Console

Add a **Domain property** for `thebestfreepdf.com` and publish Google's exact TXT verification record at the DNS provider. Alternatively, verify a URL-prefix property for `https://thebestfreepdf.com/` using `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel and redeploy. Submit `https://thebestfreepdf.com/sitemap.xml`.

Search Console ownership verification and submission remain pending; this migration does not establish Google indexing or rankings.

## References

- [Vercel domain settings](https://vercel.com/arshadnawazbaigs-projects/folio-pdf/settings/domains)
- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google Search Console ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en)
- [Google's site migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
