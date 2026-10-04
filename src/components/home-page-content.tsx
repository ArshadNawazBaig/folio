import {
  translator,
  localizedHref,
  localizeSummary,
  type PageLanguage,
} from '@/lib/i18n/translate';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  LockKeyhole,
  Monitor,
  Signature,
  Type,
} from 'lucide-react';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { popularSlugs } from '@/lib/tools';
import { HomeUpload } from '@/components/upload';
import { HomeTools } from '@/components/home-tools';
import { EditorPreview } from '@/components/document-preview';
import { Faq } from '@/components/faq';
import { StructuredData } from '@/components/structured-data';
import { siteUrl, organizationSchema } from '@/lib/seo';
import { guides } from '@/lib/guides';
import { locales } from '@/lib/i18n/config';
import styles from '@/components/home.module.css';
const title = 'Free Online PDF Tools — Edit, Merge, Compress & Sign';
const description =
  'Add text, sign, merge, split and convert images to PDF online. Annotation downloads are free; original-text changes are free.';
export function HomePageContent({
  locale = 'en',
  messages = {},
  uploadCopy,
}: PageLanguage & { uploadCopy?: NonNullable<Parameters<typeof HomeUpload>[0]>['copy'] }) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const tools = serverToolSummaries().map((tool) => localizeSummary(tool, messages));
  const reading = [
    'choose-a-free-pdf-editor',
    'how-to-add-text-to-a-pdf',
    'how-to-edit-a-pdf-on-mobile',
  ].map((slug) => guides.find((guide) => guide.slug === slug)!);
  return (
    <main id="main" className={styles.home}>
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema(),
            {
              '@type': 'WebSite',
              '@id': `${siteUrl}/#website`,
              name: 'Folio',
              url: siteUrl,
              description: tr(description),
              publisher: { '@id': `${siteUrl}/#organization` },
              inLanguage: [...locales],
            },
            {
              '@type': 'WebPage',
              '@id': `${siteUrl}${href('/')}#webpage`,
              url: `${siteUrl}${href('/')}`,
              name: tr(title),
              description: tr(description),
              isPartOf: { '@id': `${siteUrl}/#website` },
              about: { '@id': `${siteUrl}/#organization` },
              inLanguage: locale,
            },
          ],
        }}
      />
      <section className={styles.hero}>
        <div className="container">
          <span className={styles.eyebrow}>{tr('PDF TOOLS, WITHOUT THE FUSS.')}</span>
          <h1>
            {tr('Good work starts')}
            <br />
            {tr('with a')} <span>{tr('simpler PDF.')}</span>
          </h1>
          <p className={styles.description}>
            {tr(
              'Edit, sign, merge and organize. Everything you need to move your documents forward.',
            )}
          </p>
          <HomeUpload copy={uploadCopy} />
          <div className={styles.heroBottom}>
            <Link prefetch={false} href={href('/workspace?sample=proposal')}>
              {tr('Try a sample document')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <div className={styles.assurances}>
              <span>
                <Check size={15} aria-hidden="true" />
                {tr('Start as a guest')}
              </span>
              <span>
                <Check size={15} aria-hidden="true" />
                {tr('No installation')}
              </span>
            </div>
          </div>
        </div>
      </section>
      <HomeTools tools={tools} popularSlugs={popularSlugs} />
      <section className={`container ${styles.feature}`} aria-labelledby="workspace-title">
        <div>
          <span className={styles.eyebrow}>{tr('A WORKSPACE THAT GETS OUT OF YOUR WAY')}</span>
          <h2 id="workspace-title">{tr('Open it. Edit it. Done.')}</h2>
          <p>{tr('Add the finishing touches, review your pages and download your document.')}</p>
          <ul>
            <li>
              <Type size={24} aria-hidden="true" />
              {tr('Text and highlights')}
            </li>
            <li>
              <Signature size={24} aria-hidden="true" />
              {tr('Signatures')}
            </li>
            <li>
              <FileText size={24} aria-hidden="true" />
              {tr('Page organization')}
            </li>
          </ul>
          <Link prefetch={false} href={href('/edit-pdf')} className="button secondary">
            {tr('Explore the editor')} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <EditorPreview messages={messages} />
      </section>
      <section className={styles.confidence} aria-label={tr('Made for everyday documents')}>
        <div className="container">
          <div className={styles.confidenceItem}>
            <LockKeyhole size={28} aria-hidden="true" />
            <span>
              <strong>{tr('Private cloud drafts')}</strong>
              <small>{tr('Pick up where you left off.')}</small>
            </span>
          </div>
          <div className={styles.confidenceItem}>
            <Monitor size={28} aria-hidden="true" />
            <span>
              <strong>{tr('Made for your browser')}</strong>
              <small>{tr('No software to install.')}</small>
            </span>
          </div>
          <div className={styles.confidenceItem}>
            <ArrowRight size={28} aria-hidden="true" />
            <span>
              <strong>{tr('A simpler workflow')}</strong>
              <small>{tr('Open. Edit. Download.')}</small>
            </span>
          </div>
        </div>
      </section>
      <section className={`container ${styles.resources}`} aria-labelledby="editor-guides-title">
        <span className={styles.eyebrow}>{tr('A GOOD PLACE TO BEGIN')}</span>
        <h2 id="editor-guides-title">{tr('Find the best free PDF tool for your task.')}</h2>
        <div className="tool-reading-grid">
          {reading.map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`}>
              <strong>
                {tr(guide.title)}
                <ArrowUpRight size={16} aria-hidden="true" />
              </strong>
              <span>{tr(guide.description)}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className={`container ${styles.faq}`}>
        <div>
          <span className={styles.eyebrow}>{tr('A LITTLE CLARITY')}</span>
          <h2>
            {tr('Good questions.')}
            <br />
            {tr('Simple answers.')}
          </h2>
          <p>{tr('Using PDF tools online, from your first upload to the finished file.')}</p>
        </div>
        <Faq
          items={[
            [
              'What can I do with these online PDF tools?',
              'Add text, highlights, images, and signatures; fill forms; merge, split, and organize pages; or convert PDF pages to images. These workflows include free downloads. Original-text editing can be tried in the editor, and downloading those changes is free. Password-protected, translated, and Office-converted downloads also are free when available.',
            ],
            [
              'Do I need to install software or create an account?',
              'Use Folio in your browser without installing software. You can start as a guest without Google sign-in. Guest editor files use private cloud storage, with 1 GB of space and a 24-hour expiry. Sign in to keep your documents and access them across your devices.',
            ],
            [
              'Can I open and read a PDF online?',
              'Yes. Open a PDF in the editor, move between pages and use the zoom controls to read it. Viewing does not are free. Editor documents are saved in private cloud storage; guest files expire after 24 hours.',
            ],
            [
              'Where do my documents go?',
              'The editor automatically uploads your document and saves changes to private cloud storage, including for guests. Standalone merge, split, and image tools process files in your browser. Some original-text operations and password protection use Folio’s servers; translation and Office conversion use connected document services.',
            ],
            [
              'Can I use Folio on my phone?',
              'Yes. The interface adapts to smaller screens. Large PDFs can exceed a phone’s available memory, so a desktop browser is better for complex documents.',
            ],
            [
              'Are all the tools available?',
              'Editing, page tools, forms, image conversion, and text extraction are available. Translation and Office conversion use connected services; their current availability is shown in the tool directory.',
            ],
            [
              'Will my original document change?',
              'No. Folio creates a downloadable copy. Keep your original file, especially when working with signed documents or interactive forms.',
            ],
          ].map(([question, answer]): [string, string] => [tr(question), tr(answer)])}
        />
      </section>
      <section className={`container ${styles.closing}`}>
        <div>
          <h2>{tr('A little less paperwork starts here.')}</h2>
          <Link prefetch={false} href={href('/workspace')} className="button primary">
            {tr('Open a PDF')} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
