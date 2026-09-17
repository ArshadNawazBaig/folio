# Custom domain: thebestfreepdf.com

Preferred public origin: `https://thebestfreepdf.com`.

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
