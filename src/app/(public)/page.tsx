import { connection } from 'next/server';
import { serverTools } from '@/lib/server/tool-catalog';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  MousePointer2,
  Zap,
  Check,
  Languages,
  FileText,
  MoveRight,
} from 'lucide-react';
import { HomeUpload } from '@/components/upload';
import { EditorPreview } from '@/components/document-preview';
import { ToolIcon } from '@/components/icon';
import { Faq } from '@/components/faq';
import { popularSlugs } from '@/lib/tools';
import { pageMetadata, siteUrl, organizationSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { guides } from '@/lib/guides';
export const metadata = pageMetadata(
  'Free PDF Tools Online — Edit, Merge, Compress & Sign',
  'Add text, annotate, sign, merge and split PDFs online with free downloads. Original-text edits require a paid plan to download. Start with Folio in your browser.',
  '/',
);
export default async function Home() {
  await connection();
  const tools = serverTools();
  const translationReady = tools.find((t) => t.slug === 'translate-pdf')?.available;
  const reading = [
    'choose-a-free-pdf-editor',
    'how-to-add-text-to-a-pdf',
    'how-to-edit-a-pdf-on-mobile',
  ].map((slug) => guides.find((guide) => guide.slug === slug)!);
  return (
    <main id="main">
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
              description: 'Online PDF editing, conversion, forms, and document tools.',
              publisher: { '@id': `${siteUrl}/#organization` },
              inLanguage: 'en',
            },
          ],
        }}
      />
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            LESS PAPERWORK. MORE POSSIBILITY.
          </div>
          <h1>
            Free PDF tools.
            <br />
            <em>
              Beautifully
              <br className="hero-break" /> handled.
            </em>
          </h1>
          <p className="hero-description">
            Add text, annotate, sign, merge, and split PDFs online for free.
            <br />
            Useful tools. Free downloads. Right in your browser.
          </p>
          <HomeUpload />
          <Link prefetch={false} href="/workspace?sample=proposal" className="sample-link">
            Just looking? Try a sample document <ArrowRight size={15} />
          </Link>
        </div>
        <EditorPreview />
      </section>
      <section className="popular-section container" aria-labelledby="popular-title">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">A GOOD PLACE TO START</span>
            <h2 id="popular-title">Free tools for everyday PDFs.</h2>
          </div>
          <Link prefetch={false} href="/tools" className="text-link">
            Explore all tools <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="popular-tools">
          {popularSlugs.map((slug) => {
            const t = tools.find((t) => t.slug === slug)!;
            return (
              <Link prefetch={false} href={`/${t.slug}`} className="popular-tool" key={t.slug}>
                <div className={`tool-icon ${t.color}`}>
                  <ToolIcon name={t.icon} size={25} />
                </div>
                <h3>
                  {t.name}
                  <ArrowUpRight size={15} />
                </h3>
                <p>{t.short}</p>
                {!t.available && <span className="coming-small">Coming soon</span>}
              </Link>
            );
          })}
        </div>
        <div className="free-tools-note">
          <p>
            Added text, annotations, signatures, and page tools include free downloads. Downloads
            containing changes to original PDF text require a paid plan.
          </p>
          <Link href="/guides/choose-a-free-pdf-editor" className="text-link">
            Compare free PDF editors <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="confidence-strip container">
        <div>
          <ShieldCheck />
          <span>
            <strong>Private by design</strong>
            <small>Editor drafts use private cloud storage.</small>
          </span>
        </div>
        <div>
          <MousePointer2 />
          <span>
            <strong>Refreshingly straightforward</strong>
            <small>Open a file. Make your changes. Done.</small>
          </span>
        </div>
        <div>
          <Zap />
          <span>
            <strong>Ready when you are</strong>
            <small>No installation. Start as a guest.</small>
          </span>
        </div>
      </section>
      <section className="feature-section container">
        <div className="feature-copy">
          <span className="eyebrow">ONE DOCUMENT. ENDLESS POSSIBILITIES.</span>
          <h2>
            From first draft
            <br />
            to <em>ready to share.</em>
          </h2>
          <p>
            A note here. A signature there. A few pages in a better order. It’s the little things
            that make a document feel finished.
          </p>
          <ul className="check-list">
            <li>
              <Check size={16} />
              Add text, highlights, and your personal touch
            </li>
            <li>
              <Check size={16} />
              Give every page its place
            </li>
            <li>
              <Check size={16} />
              Keep working without uploading again
            </li>
          </ul>
          <Link prefetch={false} href="/edit-pdf" className="button dark">
            Open the free PDF editor <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="workflow-visual">
          <div className="workflow-card back">
            <span className="eyebrow">PROJECT BRIEF</span>
            <h3>
              Something
              <br />
              worth making.
            </h3>
            <div className="faux-line" />
            <div className="faux-line short" />
            <div className="faux-line" />
            <div className="workflow-highlight">A thoughtful idea starts here.</div>
          </div>
          <div className="workflow-card front">
            <div className="workflow-file">
              <FileText size={17} />
              <span>Project brief.pdf</span>
              <Check size={14} />
            </div>
            <div className="workflow-row">
              <span className="tool-icon orange">
                <ToolIcon name="edit" />
              </span>
              <span>
                <strong>A few finishing touches</strong>
                <small>Text, highlights, and annotations</small>
              </span>
              <Check size={17} />
            </div>
            <div className="workflow-row">
              <span className="tool-icon sage">
                <ToolIcon name="pages" />
              </span>
              <span>
                <strong>Everything in order</strong>
                <small>Arrange pages your way</small>
              </span>
              <Check size={17} />
            </div>
            <div className="workflow-row">
              <span className="tool-icon sand">
                <ToolIcon name="sign" />
              </span>
              <span>
                <strong>Signed, with care</strong>
                <small>Add your signature</small>
              </span>
              <Check size={17} />
            </div>
            <Link prefetch={false} className="workflow-finish" href="/workspace?sample=proposal">
              Make something of it <ArrowRight size={16} />
            </Link>
          </div>
          <span className="workflow-caption">The details make the difference.</span>
        </div>
      </section>
      <section className="container" aria-labelledby="editor-guides-title">
        <div className="tool-reading">
          <span className="eyebrow">CHOOSE WELL. FINISH WITH CONFIDENCE.</span>
          <h2 id="editor-guides-title">Which PDF editor is right for your task?</h2>
          <div className="tool-reading-grid">
            {reading.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                <strong>
                  {guide.title} <ArrowUpRight size={16} aria-hidden="true" />
                </strong>
                <span>{guide.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="discovery-section container">
        <div className="translation-feature">
          <div className="feature-card-heading">
            <span className="tool-icon blue">
              <Languages size={24} />
            </span>
            <span className="status-label">
              {translationReady ? 'TRANSLATE PDF' : 'IN THE WORKS'}
            </span>
          </div>
          <h2>
            Good ideas.
            <br />
            <em>No language barriers.</em>
          </h2>
          <p>
            {translationReady
              ? 'Translate your PDF, review the pages side by side, and download your finished document.'
              : 'A dedicated space to bring your documents into another language. Translation is coming to Folio.'}
          </p>
          <div className="language-preview">
            <span>
              Good things
              <br />
              start here.
            </span>
            <MoveRight size={22} />
            <span lang="es">
              Las cosas buenas
              <br />
              empiezan aquí.
            </span>
          </div>
          <Link prefetch={false} href="/translate-pdf" className="text-link">
            Explore the translation workspace <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="forms-feature">
          <div className="feature-card-heading">
            <span className="tool-icon sage">
              <ToolIcon name="form" size={24} />
            </span>
            <span className="eyebrow">A HEAD START HELPS</span>
          </div>
          <h2>
            Less blank page.
            <br />
            <em>More getting started.</em>
          </h2>
          <p>
            Fill a form, build your own, or borrow a little inspiration from our ready-to-use
            templates.
          </p>
          <div className="form-mini">
            <span className="form-mini-label">A good introduction.</span>
            <div className="form-mini-row">
              <div>
                <span>Your name</span>
                <i>Alex Morgan</i>
              </div>
              <div>
                <span>What’s your big idea?</span>
                <i>Something wonderful.</i>
              </div>
            </div>
            <div className="form-mini-check">
              <span>
                <Check size={10} />
              </span>
              Let’s make it happen.
            </div>
          </div>
          <Link prefetch={false} href="/forms" className="text-link">
            Find your starting point <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="home-faq container">
        <div>
          <span className="eyebrow">A LITTLE CLARITY</span>
          <h2>
            Good questions.
            <br />
            <em>Simple answers.</em>
          </h2>
          <p>Everything you need to feel at home.</p>
        </div>
        <Faq
          items={[
            [
              'What can I do with Folio for free?',
              'Add text, highlights, images, and signatures; fill forms; merge, split, and organize pages; or convert PDF pages to images. These workflows include free downloads. Original-text editing can be tried in the editor, but downloading those changes requires a paid plan. Password-protected, translated, and Office-converted downloads also require a paid plan when available.',
            ],
            [
              'Do I need an account to use Folio?',
              'You can start as a guest without Google sign-in. Guest editor files use private cloud storage, with 100 MB of space and a 24-hour expiry. Sign in with Google to keep your documents and access them across your devices.',
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
      <section className="closing-cta container">
        <div>
          <span className="eyebrow">MAKE ROOM FOR WHAT MATTERS</span>
          <h2>A better day for your documents.</h2>
        </div>
        <Link prefetch={false} href="/tools" className="button primary">
          Find your tool <ArrowUpRight size={18} />
        </Link>
      </section>
    </main>
  );
}
