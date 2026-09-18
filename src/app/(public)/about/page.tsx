import Link from 'next/link';
import { pageMetadata, organizationSchema, productDescription, siteUrl } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'About Folio — Thoughtful PDF Tools',
  'Folio brings practical PDF tools into a calm, approachable workspace. Learn what works today and what is still being built.',
  '/about',
);
export default function About() {
  return (
    <main id="main" className="container prose-page">
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          '@id': `${siteUrl}/about#page`,
          url: `${siteUrl}/about`,
          name: 'About Folio',
          description: productDescription,
          mainEntity: organizationSchema(),
        }}
      />
      <span className="eyebrow">A LITTLE LESS PAPERWORK</span>
      <h1>
        Made for the work
        <br />
        <em>between the big ideas.</em>
      </h1>
      <p>
        A document can be a beginning, a decision, a small detail that moves something forward.
        Folio is a place to handle those details with a little more clarity and a little less
        friction.
      </p>
      <h2 id="what-is-folio">What is Folio?</h2>
      <p>{productDescription}</p>
      <p>
        File handling depends on the workflow. Our{' '}
        <Link href="/guides/does-folio-upload-pdf-files">
          local processing and cloud saving guide
        </Link>{' '}
        compares what happens to your PDF before you choose a tool.
      </p>
      <h2>One thoughtful place to work.</h2>
      <p>
        Edit and annotate PDFs, arrange their pages, bring files together, fill forms, and find a
        useful new format. The tools share a familiar workspace so you can keep your attention on
        the document.
      </p>
      <h2>Useful today. Room to grow.</h2>
      <p>
        The available local tools include annotations and visual signatures, page organization,
        merging, splitting, structural optimization, watermarks, page numbers, cropping, image
        conversion, text extraction, and supported PDF forms.{' '}
        <Link href="/tools">Explore the toolkit</Link> to find your next step.
      </p>
      <p>
        Cloud-saved PDFs are available across your devices. Translation and Office conversion work
        when their services are connected. Certificate-based digital signatures, secure redaction,
        and standalone OCR are not part of the current release.
      </p>
      <h2>Designed around your documents.</h2>
      <p>
        Annotation and page tools run on your device. Folio also offers existing text editing, find
        and replace, and password protection through server processing. The editor automatically
        saves a private cloud workspace so you can pick up where you left off, while a download puts
        the finished file in your hands. Our <Link href="/privacy">privacy explanation</Link>{' '}
        describes the details.
      </p>
      <h2 id="editorial">How we write our PDF guides.</h2>
      <p>
        Folio publishes its own product guides and tutorials. These explain the tools available in
        this app, the steps to use them, and limitations to check before sharing a document. They
        are product guidance from Folio, not independent rankings of PDF services.
      </p>
      <p>
        Free downloads and paid exports are identified in the relevant guides. Publication and
        update dates describe the article, not a promise that every PDF will produce the same
        result. If a step is unclear or a tool behaves differently on your file,{' '}
        <Link href="/support">report the issue to support</Link> so we can investigate.
      </p>
      <h2>A little help when you need it.</h2>
      <p>
        Our <Link href="/guides">practical guides</Link> explain common PDF tasks and the limits of
        each approach. Clear expectations make for better documents.
      </p>
    </main>
  );
}
