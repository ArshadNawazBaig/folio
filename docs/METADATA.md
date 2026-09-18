# Folio metadata and the GEO checker report

The implementation refines social previews, adds accurate author attribution and image alternative text, and keeps the free/paid distinction visible in the homepage introduction. Metadata is generated server-side by Next.js; do not paste a second copy into the layout. Changes need a production deployment before they appear at `https://thebestfreepdf.com`.

## Which findings need action?

| Checker finding                                 | Decision for Folio                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing `keywords`                              | Do not add it to the homepage to chase a score. Google explicitly ignores this tag for indexing and ranking. Existing blog-tag metadata remains available, but is not an AI ranking mechanism. Use task terms in helpful visible content instead. |
| Open Graph title must be 25–35 characters       | The Open Graph protocol does not prescribe this range. The new homepage title is nevertheless a concise 29-character brand/task label. Other pages keep their own descriptive titles.                                                             |
| Open Graph description must be 55–65 characters | This is a checker preference. Open Graph describes a one- or two-sentence summary. The homepage now uses a clear 62-character summary of its free tasks.                                                                                          |
| Twitter description must be 150–200 characters  | Do not treat this range as an AI ranking requirement. The homepage now has a more detailed 178-character social summary, including the paid original-text exception.                                                                              |
| Missing `twitter:site` / `twitter:creator`      | The owner confirmed Folio has no official X account. Omit both. Do not invent a handle or use a display name as an account identifier.                                                                                                            |
| Missing `hreflang`                              | The website is currently English-only, with `<html lang="en">`. Add alternates only when corresponding translated or regional pages really exist. The PDF translation tool is not a translated version of the website.                            |
| Missing `author`                                | Public pages now identify Folio and link to About. Blog articles retain their actual configured author. This describes authorship; it does not certify expertise or identity.                                                                     |
| Missing `format-detection`                      | Added controls for automatic phone/address/email detection. This is mobile presentation behavior, not a ranking signal; use explicit `tel:` and `mailto:` links wherever visitors need them.                                                      |
| Missing `llms.txt` / `.well-known/ai.txt`       | No new AI files were added. Google's AI-search guidance says special AI text files are not needed. The checker screenshot does not establish a universal requirement for `.well-known/ai.txt`.                                                    |

References: [Google's supported metadata](https://developers.google.com/search/docs/crawling-indexing/special-tags), [Open Graph protocol](https://ogp.me/), [localized page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions), and [Google's AI-search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). These checker scores do not measure indexing, citations or ranking in Google, Bing, ChatGPT, Gemini or Perplexity.

## Recommended copy

The search title remains **Free Online PDF Tools — Edit, Merge, Compress & Sign | Folio**. It accurately describes the homepage's tools. An alternative for a future editorial test is **Free PDF Tools for Text, Signing & Merging | Folio**; do not repeatedly switch titles without a reason and comparable performance data.

The search description is **Use Folio to add text, sign, merge, split and convert images to PDF. Download annotations free; original-text changes require a paid plan.** All 138 characters carry product information, including the paid exception. Putting the important facts early helps readers; 160 characters is not a universal AI extraction boundary.

The visible opening now says: **Use Folio to add text, sign, merge, and split PDFs in your browser. Download these changes free. Original-text changes need a paid plan.** That gives visitors the same brand, task and pricing information without requiring JavaScript.

## HTML equivalent for a static or server-rendered site

This is the homepage's intended metadata. In Folio, the Metadata API generates it. For another framework, render these tags in the initial document head and escape dynamic values.

```html
<html lang="en">
  <head>
    <title>Free Online PDF Tools — Edit, Merge, Compress &amp; Sign | Folio</title>
    <meta
      name="description"
      content="Use Folio to add text, sign, merge, split and convert images to PDF. Download annotations free; original-text changes require a paid plan."
    />
    <meta name="author" content="Folio" />
    <link rel="author" href="https://thebestfreepdf.com/about" />
    <link rel="canonical" href="https://thebestfreepdf.com" />
    <meta name="format-detection" content="telephone=no, address=no, email=no" />
    <!-- Production public pages only; previews and private pages stay noindex. -->
    <meta name="robots" content="index, follow" />
    <meta
      name="googlebot"
      content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Folio" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="https://thebestfreepdf.com" />
    <meta property="og:title" content="Folio — Free Online PDF Tools" />
    <meta
      property="og:description"
      content="Free tools to add text, sign, merge and split PDFs with Folio."
    />
    <meta
      property="og:image"
      content="https://thebestfreepdf.com/og?title=Folio%20%E2%80%94%20Free%20Online%20PDF%20Tools"
    />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Folio — Free Online PDF Tools — preview card" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Folio — Free Online PDF Tools" />
    <meta
      name="twitter:description"
      content="Add text, sign, merge, split and convert images to PDF with Folio in your browser. Download annotations free without a Folio watermark. Original-text changes require a paid plan."
    />
    <meta
      name="twitter:image"
      content="https://thebestfreepdf.com/og?title=Folio%20%E2%80%94%20Free%20Online%20PDF%20Tools"
    />
    <meta name="twitter:image:alt" content="Folio — Free Online PDF Tools — preview card" />
  </head>
</html>
```

Retain the existing viewport, icons, RSS link and ownership-verification tags. Do not add `keywords`, fabricated social accounts, or alternate-language URLs to make this example pass an unrelated checker.

## Next.js implementation

`src/lib/seo.ts` now accepts optional social copy while retaining each page's search description, canonical URL, preview/indexing protections and RSS discovery. `src/app/layout.tsx` provides mobile format-detection controls. The homepage uses:

```tsx
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Free Online PDF Tools — Edit, Merge, Compress & Sign',
  'Use Folio to add text, sign, merge, split and convert images to PDF. Download annotations free; original-text changes require a paid plan.',
  '/',
  true,
  {
    title: 'Folio — Free Online PDF Tools',
    description: 'Free tools to add text, sign, merge and split PDFs with Folio.',
    twitterDescription:
      'Add text, sign, merge, split and convert images to PDF with Folio in your browser. Download annotations free without a Folio watermark. Original-text changes require a paid plan.',
  },
);
```

Use distinct copy for tool and article pages. Next.js shallow-merges nested metadata; when overriding a blog cover, preserve the base Twitter properties and supply the real cover alternative text. This is handled in `src/app/(public)/blog/[slug]/page.tsx`.

For a CMS such as WordPress, set these values through its existing metadata integration and disable duplicate theme/plugin outputs. Preserve the CMS's canonical, article author and publication dates. In a client-rendered SPA, use prerendering or server rendering so the head and useful page content arrive without browser JavaScript.

## Homepage JSON-LD

The homepage uses a connected Organization → WebSite → WebPage graph. The following is a valid minimal equivalent of the implemented graph; Folio also publishes its existing organization description, logo dimensions and support contact. Put the JSON in a `<script type="application/ld+json">` element. Folio's `StructuredData` component already handles escaping `<` characters.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://thebestfreepdf.com/#organization",
      "name": "Folio",
      "url": "https://thebestfreepdf.com",
      "logo": "https://thebestfreepdf.com/icon-512.png"
    },
    {
      "@type": "WebSite",
      "@id": "https://thebestfreepdf.com/#website",
      "name": "Folio",
      "url": "https://thebestfreepdf.com",
      "inLanguage": "en",
      "publisher": { "@id": "https://thebestfreepdf.com/#organization" }
    },
    {
      "@type": "WebPage",
      "@id": "https://thebestfreepdf.com/#webpage",
      "url": "https://thebestfreepdf.com/",
      "name": "Free Online PDF Tools — Edit, Merge, Compress & Sign",
      "description": "Use Folio to add text, sign, merge, split and convert images to PDF. Download annotations free; original-text changes require a paid plan.",
      "inLanguage": "en",
      "isPartOf": { "@id": "https://thebestfreepdf.com/#website" },
      "about": { "@id": "https://thebestfreepdf.com/#organization" }
    }
  ]
}
```

Keep the existing FAQ markup synchronized with visible questions and answers. Tool pages already describe their actual SoftwareApplication, and guides/blogs have Article/BlogPosting markup. Do not add ratings, awards, free offers for paid tools, or invented personal authors. Schema describes the content; it does not guarantee rich results or AI citations.

## Content and keyword strategy

| Intent                            | Primary destination | Useful supporting detail                                                                      |
| --------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| Free online PDF tools             | `/`                 | Explain free tasks, paid exceptions, supported inputs and actual availability.                |
| Add text to a PDF for free        | `/edit-pdf`         | Distinguish annotations from changing original words; show the exported result.               |
| Merge PDF files without uploading | `/merge-pdf`        | Explain standalone local processing and the cloud upload when continuing in the editor.       |
| Reduce PDF file size              | `/compress-pdf`     | Explain structural optimization, unchanged image resolution and why some files do not shrink. |
| Sign a PDF online                 | `/sign-pdf`         | Explain visual signatures and the absence of certificate-based signing.                       |
| Change existing PDF text          | `/edit-pdf-text`    | Explain supported text, scanned-document limitations and paid downloads.                      |

These are editorial task mappings, not measured search-volume estimates. Use a natural task phrase in the page heading and opening explanation. The existing nine tool summaries, FAQs and linked guides already answer the relevant questions. Improve the original page when support or search data reveals a gap; do not generate near-duplicate landing pages for keyword variants.

Keep Folio's name and identity consistent in visible copy and structured data. Retain semantic headings, labelled controls, accessible tables, image alternative text, and FAQs whose answers exist in the HTML. Keep core task and price information early in the content, while allowing longer explanations wherever the user needs them.

If an official X account is created, add its real handle as `twitter.site`; use `twitter.creator` only for an account that actually created that content. A brand account is not automatically the author of guest articles. If translated website pages launch, provide reciprocal `hreflang` links on each real language version and self-canonical URLs; do not point imaginary language variants at the same English homepage.

## Verification

Run `npm run test:seo`, `npm run lint`, `npm run typecheck` and `npm run build`. Browser assertions cover initial HTML, independent search/social copy, truthful authorship, social-image alternative text and consistent entity IDs, as well as the existing crawl/private-route protections. After deploying, inspect the live head and social preview image and use the account reports described in [GEO.md](GEO.md). A checker score is not a substitute for real impressions, referrals or citations.

Local verification on September 18, 2026 passed: eight public-content browser checks, three metadata unit checks, lint, type checking, formatting and the production build. The homepage was also inspected at desktop and 390px mobile widths without JavaScript; no horizontal overflow was found. These metadata changes have not been deployed in this task.
