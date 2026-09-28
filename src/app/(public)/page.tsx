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
import { pageMetadata, siteUrl, organizationSchema } from '@/lib/seo';
import { guides } from '@/lib/guides';
import styles from '@/components/home.module.css';
const title = 'Free Online PDF Tools — Edit, Merge, Compress & Sign';
const description =
  'Add text, sign, merge, split and convert images to PDF online. Annotation downloads are free; original-text changes require a paid plan.';
export const metadata = pageMetadata(title, description, '/', true, {
  title: 'Folio — Free Online PDF Tools',
  description: 'Free tools to add text, sign, merge and split PDFs with Folio.',
  twitterDescription:
    'Add text, sign, merge, split and convert images to PDF with Folio in your browser. Download annotations free without a Folio watermark. Original-text changes require a paid plan.',
});
// Public copy and provider availability are shared across visitors. Regenerate
// periodically; account state and the maintenance gate remain request-specific.
export const revalidate = 300;
export default function Home() {
  const tools = serverToolSummaries();
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
              description,
              publisher: { '@id': `${siteUrl}/#organization` },
              inLanguage: 'en',
            },
            {
              '@type': 'WebPage',
              '@id': `${siteUrl}/#webpage`,
              url: `${siteUrl}/`,
              name: title,
              description,
              isPartOf: { '@id': `${siteUrl}/#website` },
              about: { '@id': `${siteUrl}/#organization` },
              inLanguage: 'en',
            },
          ],
        }}
      />
      <section className={styles.hero}>
        <div className="container">
          <span className={styles.eyebrow}>PDF TOOLS, WITHOUT THE FUSS.</span>
          <h1>
            Good work starts
            <br />
            with a <span>simpler PDF.</span>
          </h1>
          <p className={styles.description}>
            Edit, sign, merge and organize. Everything you need to move your documents forward.
          </p>
          <HomeUpload />
          <div className={styles.heroBottom}>
            <Link prefetch={false} href="/workspace?sample=proposal">
              Try a sample document <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <div className={styles.assurances}>
              <span>
                <Check size={15} aria-hidden="true" />
                Start as a guest
              </span>
              <span>
                <Check size={15} aria-hidden="true" />
                No installation
              </span>
            </div>
          </div>
        </div>
      </section>
      <HomeTools tools={tools} popularSlugs={popularSlugs} />
      <section className={`container ${styles.feature}`} aria-labelledby="workspace-title">
        <div>
          <span className={styles.eyebrow}>A WORKSPACE THAT GETS OUT OF YOUR WAY</span>
          <h2 id="workspace-title">Open it. Edit it. Done.</h2>
          <p>Add the finishing touches, review your pages and download your document.</p>
          <ul>
            <li>
              <Type size={24} aria-hidden="true" />
              Text and highlights
            </li>
            <li>
              <Signature size={24} aria-hidden="true" />
              Signatures
            </li>
            <li>
              <FileText size={24} aria-hidden="true" />
              Page organization
            </li>
          </ul>
          <Link prefetch={false} href="/edit-pdf" className="button secondary">
            Explore the editor <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <EditorPreview />
      </section>
      <section className={styles.confidence} aria-label="Made for everyday documents">
        <div className="container">
          <div className={styles.confidenceItem}>
            <LockKeyhole size={28} aria-hidden="true" />
            <span>
              <strong>Private cloud drafts</strong>
              <small>Pick up where you left off.</small>
            </span>
          </div>
          <div className={styles.confidenceItem}>
            <Monitor size={28} aria-hidden="true" />
            <span>
              <strong>Made for your browser</strong>
              <small>No software to install.</small>
            </span>
          </div>
          <div className={styles.confidenceItem}>
            <ArrowRight size={28} aria-hidden="true" />
            <span>
              <strong>A simpler workflow</strong>
              <small>Open. Edit. Download.</small>
            </span>
          </div>
        </div>
      </section>
      <section className={`container ${styles.resources}`} aria-labelledby="editor-guides-title">
        <span className={styles.eyebrow}>A GOOD PLACE TO BEGIN</span>
        <h2 id="editor-guides-title">Find the best free PDF tool for your task.</h2>
        <div className="tool-reading-grid">
          {reading.map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`}>
              <strong>
                {guide.title}
                <ArrowUpRight size={16} aria-hidden="true" />
              </strong>
              <span>{guide.description}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className={`container ${styles.faq}`}>
        <div>
          <span className={styles.eyebrow}>A LITTLE CLARITY</span>
          <h2>
            Good questions.
            <br />
            Simple answers.
          </h2>
          <p>Using PDF tools online, from your first upload to the finished file.</p>
        </div>
        <Faq
          items={[
            [
              'What can I do with these online PDF tools?',
              'Add text, highlights, images, and signatures; fill forms; merge, split, and organize pages; or convert PDF pages to images. These workflows include free downloads. Original-text editing can be tried in the editor, but downloading those changes requires a paid plan. Password-protected, translated, and Office-converted downloads also require a paid plan when available.',
            ],
            [
              'Do I need to install software or create an account?',
              'Use Folio in your browser without installing software. You can start as a guest without Google sign-in. Guest editor files use private cloud storage, with 100 MB of space and a 24-hour expiry. Sign in to keep your documents and access them across your devices.',
            ],
            [
              'Can I open and read a PDF online?',
              'Yes. Open a PDF in the editor, move between pages and use the zoom controls to read it. Viewing does not require a paid plan. Editor documents are saved in private cloud storage; guest files expire after 24 hours.',
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
          ]}
        />
      </section>
      <section className={`container ${styles.closing}`}>
        <div>
          <h2>A little less paperwork starts here.</h2>
          <Link prefetch={false} href="/workspace" className="button primary">
            Open a PDF <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
