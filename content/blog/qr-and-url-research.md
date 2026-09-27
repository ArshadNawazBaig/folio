# QR code and URL shortener editorial notes

Researched and checked against the application on September 28, 2026.

These two original guides answer practical questions for people using Folio. Search results and primary product documentation informed topic selection. No Keyword Planner, Search Console, or paid keyword-volume dataset was available, so these are search-intent targets, not a verified ranking of the most-searched terms. No search-volume figures or ranking promises are included.

| Article                                    | Primary informational query        | Supporting queries covered naturally                                                                                                              |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/blog/how-to-create-a-qr-code-for-a-link` | how to create a QR code for a link | free QR code generator; static vs dynamic QR code; QR code for PDF; WiFi QR code; do QR codes expire; QR code not scanning; QR code PNG or SVG    |
| `/blog/how-to-shorten-a-url`               | how to shorten a URL               | free URL shortener; link shortener; custom short link; custom URL alias; QR code for a short link; change link destination; do short links expire |

The transactional destinations remain `/create-qr-code` and `/url-shortener`. The articles explain decisions, steps, and troubleshooting, with contextual links to those tools. Both include distinct excerpts and SEO titles/descriptions, readable slugs, descriptive photo alt text, and related-article links. Existing blog metadata and sitemap behavior will apply when the drafts are published.

## Sources and their use

- [DENSO WAVE: determining the QR code area](https://www.qrcode.com/en/howto/code.html) supports the four-module quiet-zone explanation. Linked beside that explanation in the QR article.
- [Google Analytics: campaign URL parameters](https://support.google.com/analytics/answer/10917952?hl=en) supports the UTM example and campaign-reporting guidance. Linked in the URL article. Folio itself does not provide click or scan analytics.
- [Bitly’s URL shortener product page](https://bitly.com/pages/products/url-shortener) helped identify query themes around free shortening, custom links, QR codes, and campaign URLs. Its plan limits and capabilities were not used as Folio facts.
- [Google Search Central: helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) informed the editorial approach: answer the task clearly, use original examples, and avoid keyword repetition or a claimed preferred SEO word count.

The café and workshop examples are illustrative, not customer case studies or claims of firsthand experiments. The author remains the existing Folio Editorial byline. No invented testimonials, performance claims, or “human-written” guarantee were added.

## Product facts checked

| Source                                                                  | Facts reflected in the articles                                                                                                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/qr-workbench.tsx`, `src/lib/qr-code.ts`                 | Standalone QR generation without sign-in; website, text, and Wi-Fi modes; color controls; PNG sizes; SVG export; static payload; included quiet zone. |
| `src/components/short-links.tsx`, `src/components/short-link-qr.tsx`    | Actual button names; account sign-in; title versus alias; saved-link search; PNG/SVG QR downloads; editing and deletion behavior.                     |
| `src/lib/short-links.ts`, `src/lib/server/short-links.ts`               | 10 Free and 1,000 Pro saved links; alias validation; destination validation; Pro-only custom aliases and destination changes.                         |
| `supabase/migrations/013_short_links.sql`, `src/app/s/[alias]/route.ts` | Public redirects; no automatic link-expiry field; deleted aliases remain reserved; saved-link deletion stops redirects.                               |

Keep the limits and capabilities current when editing the CMS copies. The articles link to pricing instead of embedding subscription prices. Private workspace files are not described as public PDF hosting. Neither article promises custom domains, scan analytics, logo overlays, unlimited free links, or guaranteed permanent availability.

## Review and publication

Source IDs end in `107` (QR) and `108` (URL). The importer validates their rich content, metadata, internal links, photo credits, and unique IDs/slugs before saving. Their Unsplash covers are credited in each article and listed in the collection README.

Import with `--drafts` for review in `/admin/blog`. Publish both together if keeping the cross-links. The importer preserves already-published posts and edited drafts; CMS edits remain authoritative after import.
