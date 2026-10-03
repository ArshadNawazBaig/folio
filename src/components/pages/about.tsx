import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { pageMetadata, organizationSchema, productDescription, siteUrl } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'About Folio — Thoughtful PDF Tools',
  'Folio brings practical PDF tools into a calm, approachable workspace. Learn what works today and what is still being built.',
  '/about',
);
export default function About({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  return (
    <main id="main" className="container prose-page with-page-heading">
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
      <header className="page-heading">
        <span className="eyebrow">{tr('A LITTLE LESS PAPERWORK')}</span>
        <h1>
          {tr('Made for the work')}
          <br />
          <em>{tr('between the big ideas.')}</em>
        </h1>
        <p>
          {tr(
            'A document can be a beginning, a decision, a small detail that moves something forward. Folio is a place to handle those details with a little more clarity and a little less friction.',
          )}
        </p>
      </header>
      <h2 id="what-is-folio">{tr('What is Folio?')}</h2>
      <p>{tr(productDescription)}</p>
      <p>
        {tr('File handling depends on the workflow. Our')}{' '}
        <Link href={href('/guides/does-folio-upload-pdf-files')}>
          {tr('local processing and cloud saving guide')}
        </Link>{' '}
        {tr('compares what happens to your PDF before you choose a tool.')}
      </p>
      <h2>{tr('One thoughtful place to work.')}</h2>
      <p>
        {tr(
          'Edit and annotate PDFs, arrange their pages, bring files together, fill forms, and find a useful new format. The tools share a familiar workspace so you can keep your attention on the document.',
        )}
      </p>
      <h2>{tr('Useful today. Room to grow.')}</h2>
      <p>
        {tr(
          'The available local tools include annotations and visual signatures, page organization, merging, splitting, structural optimization, watermarks, page numbers, cropping, image conversion, text extraction, and supported PDF forms.',
        )}{' '}
        <Link href={href('/tools')}>{tr('Explore the toolkit')}</Link>{' '}
        {tr('to find your next step.')}
      </p>
      <p>
        {tr(
          'Cloud-saved PDFs are available across your devices. Translation and Office conversion work when their services are connected. Certificate-based digital signatures, secure redaction, and standalone OCR are not part of the current release.',
        )}
      </p>
      <h2>{tr('Designed around your documents.')}</h2>
      <p>
        {tr(
          'Annotation and page tools run on your device. Folio also offers existing text editing, find and replace, and password protection through server processing. The editor automatically saves a private cloud workspace so you can pick up where you left off, while a download puts the finished file in your hands. Our',
        )}{' '}
        <Link href={href('/privacy')}>{tr('privacy explanation')}</Link>{' '}
        {tr('describes the details.')}
      </p>
      <h2 id="editorial">{tr('How we write our PDF guides.')}</h2>
      <p>
        {tr(
          'Folio publishes its own product guides and tutorials. These explain the tools available in this app, the steps to use them, and limitations to check before sharing a document. They are product guidance from Folio, not independent rankings of PDF services.',
        )}
      </p>
      <p>
        {tr(
          'Free downloads and paid exports are identified in the relevant guides. Publication and update dates describe the article, not a promise that every PDF will produce the same result. If a step is unclear or a tool behaves differently on your file,',
        )}{' '}
        <Link href={href('/support')}>{tr('report the issue to support')}</Link>{' '}
        {tr('so we can investigate.')}
      </p>
      <h2>{tr('A little help when you need it.')}</h2>
      <p>
        {tr('Our')} <Link href={href('/guides')}>{tr('practical guides')}</Link>{' '}
        {tr(
          'explain common PDF tasks and the limits of each approach. Clear expectations make for better documents.',
        )}
      </p>
    </main>
  );
}
