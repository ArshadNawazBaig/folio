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
export const metadata = pageMetadata(
  'Free Online PDF Tools — Edit, Merge & Convert',
  'A calmer way to work with PDFs. Edit, merge, compress, convert, and fill documents in your browser. No sign-up needed for local tools.',
  '/',
);
export default async function Home() {
  await connection();
  const tools = serverTools();
  const translationReady = tools.find((t) => t.slug === 'translate-pdf')?.available;
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
            Your documents.
            <br />
            <em>
              Beautifully
              <br className="hero-break" /> handled.
            </em>
          </h1>
          <p className="hero-description">
            Your online PDF editor, converter, and form toolkit.
            <br />
            Edit, merge, compress, and sign PDFs in one place.
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
            <h2 id="popular-title">Everyday essentials.</h2>
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
      </section>
      <section className="confidence-strip container">
        <div>
          <ShieldCheck />
          <span>
            <strong>Private by design</strong>
            <small>Local tools keep files on your device.</small>
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
            <small>No installation. No account required.</small>
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
            Meet your new editor <ArrowUpRight size={16} />
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
              'Do I need an account to use Folio?',
              'You can start editing and previewing PDFs without an account. Sign in to save documents to private cloud storage and access My files across your devices.',
            ],
            [
              'Where do my documents go?',
              'Annotation and page tools process files in your browser. Original text editing and password protection send the PDF to Folio for processing; translation and Office conversion use connected document services. Saved files and signed-in checkout recovery drafts use private cloud storage.',
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
