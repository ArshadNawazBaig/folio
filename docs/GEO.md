# AI search visibility for Folio

This work targets useful, accurate references to Folio in Google AI Overviews/AI Mode, ChatGPT Search, Microsoft Copilot and Perplexity. Passing a crawl check is not evidence of indexing, citations, rankings or traffic. Changes must be deployed before they affect the public website.

## What visitors and crawlers can read

Nine tool pages now show a direct answer, input/output formats, download policy, file handling and limitations in server-rendered HTML. The same content is served to visitors and crawler user agents. Download descriptions use the existing access policy; paid tools do not advertise a zero-price offer. The upload distinction matters: standalone processing can be local while opening the same result in the editor starts private cloud saving.

`/guides/does-folio-upload-pdf-files` compares workflows and gives a receipts example. It is linked from the tool facts and About page, and included automatically in the guides index, sitemap and publication feed. `/about#what-is-folio` identifies the product with the same description used by the Organization entity. No unverified certifications, performance numbers, reviews or personal credentials have been added.

Product facts live in `src/lib/tool-facts.ts`. Check them against the tool implementation and `/privacy` whenever processing, storage, limits or exports change. The publication date reflects when the guide was added, not an independent privacy audit.

## Account setup after deployment

1. Verify `https://thebestfreepdf.com` in Google Search Console. DNS verification works for a domain property; the existing `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` supports HTML-tag verification for a URL-prefix property. Submit `/sitemap.xml` and inspect the canonical tool and guide URLs. Verification tokens are optional build-time configuration; adding a variable does not verify ownership by itself.
2. Check **Settings → Search generative AI** and confirm the effective setting includes the site, including any inherited parent setting. Inclusion is the default, but the current account setting has not been inspected. This control and its defaults are documented in [Search Console Help](https://support.google.com/webmasters/answer/16908024).
3. Verify the site in Bing Webmaster Tools, or import a verified Search Console property. For HTML verification, set `NEXT_PUBLIC_BING_SITE_VERIFICATION` to the token provided by Bing and rebuild. The layout renders `msvalidate.01`. Submit the same sitemap. See [Microsoft’s verification instructions](https://learn.microsoft.com/en-us/bingwebmaster/verifying-wordpress).
4. Review hosting/firewall crawler logs if legitimate search crawlers get challenges or errors. Robots allows public pages through a shared wildcard rule and excludes `/api/`. Workspace, account and admin routes retain noindex protection and existing access controls. A simulated user agent cannot prove that a provider’s real crawler IPs have access.

Search Console and Bing settings require access to the owner’s accounts. They have not been changed by this implementation.

## Repeatable checks

```sh
# Local fixtures only; no production documents or accounts.
npm run test:geo

# Read-only public-page checks after deployment.
GEO_AUDIT_URL=https://thebestfreepdf.com npm run test:geo
```

The suite checks visible answers without JavaScript, crawler HTTP responses, index/snippet directives, canonical URLs, product identity, paid/free disclosures, sitemap discovery, private-route exclusions, comparison links and mobile accessibility. JSON output is written to `test-results/geo-report.json`. It deliberately expects the current shared robots policy; a policy change requires review rather than silently assuming new bot-specific groups inherit wildcard rules.

The existing `npm run seo:audit -- https://thebestfreepdf.com` remains useful for the underlying public-site crawl checks. Neither command calls an AI answer engine or measures citations. No training-crawler policy was changed. OpenAI documents search and training crawlers as separate controls in its [crawler documentation](https://developers.openai.com/api/docs/bots); Perplexity lists its crawler behavior and network configuration in its [crawler guide](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).

## Measure actual AI discovery

Use the [Google Generative AI performance report](https://support.google.com/webmasters/answer/16984139) and [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) when data is available. Record the reporting period, platform, destination page and available visibility/traffic metrics. Keep platform reports separate: their coverage and definitions differ. Establish a baseline before comparing later periods.

For a small manual citation sample, repeat these representative questions under consistent locale and product settings. Record the date, exact question, engine, cited URL and whether the cited facts were correct. A brand mention without a link is not a citation; a crawl request is not a visit from an AI answer. Results vary between sessions and do not constitute a stable rank.

| User question                                         | Relevant Folio page                   |
| ----------------------------------------------------- | ------------------------------------- |
| How can I add text to a PDF and download it for free? | `/edit-pdf`                           |
| Can I combine PDF receipts without uploading them?    | `/merge-pdf`                          |
| Why does my PDF stay the same size after compression? | `/compress-pdf`                       |
| Can I sign a PDF without a digital certificate?       | `/sign-pdf`                           |
| Does a browser PDF editor upload my files?            | `/guides/does-folio-upload-pdf-files` |
| Can I change text in a scanned PDF?                   | `/pdf-to-text`, `/edit-pdf-text`      |

Use actual support questions and citation errors to improve the relevant pages. Add original worked examples or demonstrations when verified with sample files. Seek independent product feedback through normal owner-led outreach; this implementation does not publish external messages or manufacture mentions. Do not invent an AI visibility score or report gains without baseline data.

Google’s [current generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) emphasizes useful original content and normal crawl/index eligibility. It does not require `llms.txt`, a special schema or a prescribed writing format. Existing structured data describes the visible product; it is not a citation guarantee.

## Verification on September 18, 2026

Local verification passed: seven GEO browser checks, eight existing public-content browser checks, six metadata/access unit checks, lint, TypeScript and the production build. Desktop and 390px mobile views of the new product facts were inspected. Automated mobile checks found no horizontal page overflow or tested accessibility violations on the editor landing page and new guide.

A read-only production baseline fetched `/merge-pdf` with Googlebot, bingbot, OAI-SearchBot and PerplexityBot user agents. All four requests returned HTTP 200, the expected canonical URL and page content, with no noindex response header. The public robots file allowed `/` and excluded `/api/`. Those requests still received the previously deployed page; the new content has not been deployed. Real crawler-IP access, account settings, indexed coverage and AI citation results remain unverified.
