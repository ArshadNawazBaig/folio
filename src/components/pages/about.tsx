import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import {
  pageMetadata,
  organizationSchema,
  productDescription,
  siteUrl,
  siteHost,
  articleAuthorSchema,
} from '@/lib/seo';
import { articleAuthor } from '@/lib/article-author';
import { ArticleAuthor } from '@/components/article-author';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'About Folio — PDF Tools, Ownership & Editorial Standards',
  'Meet Folio’s owner, understand which PDF tasks the tools support, and learn how product guides, worked examples, and corrections are handled.',
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
          '@id': `${siteUrl}${href('/about')}#page`,
          url: `${siteUrl}${href('/about')}`,
          name: tr('About Folio'),
          description: tr(productDescription),
          inLanguage: locale,
          mainEntity: organizationSchema(),
          about: articleAuthorSchema(),
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
            'Folio helps you complete specific document tasks: correct supported PDF text, fill a form, combine attachments, or prepare a file for sharing. This page explains who runs the site, what the tools can do, and how we write and correct our guidance.',
          )}
        </p>
      </header>
      <h2 id="what-is-folio">{tr('What is Folio?')}</h2>
      <p>{tr('Folio is the free PDF toolkit at {domain}.', { domain: siteHost })}</p>
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
          'Choose a tool by the result you need. Merge and split work on whole pages; Add Text puts new information on a page; Edit Text changes supported original wording. Image conversion produces pictures of pages, while text extraction produces selectable words without the layout. These outputs serve different purposes.',
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
          'Cloud-saved PDFs are available across your devices. Certificate-based digital signatures, secure redaction, and standalone OCR are not part of the current release.',
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
      <h2 id="iram-shams">{tr('Meet the owner and author.')}</h2>
      <ArticleAuthor locale={locale} />
      <p>
        {tr('{name} owns Folio and writes its articles and PDF guides.', {
          name: articleAuthor.name,
        })}
      </p>
      <h2 id="editorial">{tr('How we write our PDF guides.')}</h2>
      <p>
        {tr(
          'Folio publishes its own product guides and tutorials. These explain the tools available in this app, the steps to use them, and limitations to check before sharing a document. They are product guidance from Folio, not independent rankings of PDF services.',
        )}
      </p>
      <p>
        {tr(
          'Available downloads and processing limits are identified in the relevant guides. Publication and update dates describe the article, not a promise that every PDF will produce the same result. If a step is unclear or a tool behaves differently on your file,',
        )}{' '}
        <Link href={href('/support')}>{tr('report the issue to support')}</Link>{' '}
        {tr('so we can investigate.')}
      </p>
      <h2 id="examples">{tr('How we check worked examples.')}</h2>
      <p>
        {tr(
          'Our practice files contain fictional documents. Where a guide reports a file size or output, it explains the input, the tool settings, and what we checked. These are Folio’s own product checks.',
        )}
      </p>
      <p>
        {tr(
          'An example is not a promise for every PDF. Scans, fonts, file structure, and device memory can change the result. Keep the original and check the downloaded file. Send unclear or outdated steps to support so we can review them.',
        )}
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
