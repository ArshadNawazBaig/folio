import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react';
import { tools, editorTools } from '@/lib/tools';
import { serverTools, isRemoteTool } from '@/lib/server/tool-catalog';
import { conversionProvider } from '@/lib/server/document-providers';
import { connection } from 'next/server';
import { ToolIcon } from '@/components/icon';
import { ToolProcessor } from '@/components/tool-processor';
import { RemotePdfWorkspace } from '@/components/remote-pdf-workspace';
import { ProTextEditor } from '@/components/pro-text-editor';
import { ProtectPdf } from '@/components/protect-pdf';
import { ImageWorkbench } from '@/components/image-workbench';
import { QrWorkbench } from '@/components/qr-workbench';
import { Faq } from '@/components/faq';
import { StructuredData } from '@/components/structured-data';
import { pageMetadata, breadcrumbSchema, siteUrl } from '@/lib/seo';
export const dynamicParams = false;
export function generateStaticParams() {
  return tools.map((t) => ({ tool: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const slug = (await params).tool;
  if (isRemoteTool(slug)) await connection();
  const catalog = serverTools();
  const t = catalog.find((t) => t.slug === slug);
  return t
    ? pageMetadata(
        `${t.name} Online${!t.available ? ' — Coming Soon' : t.premium ? ' — Folio' : ' — Free PDF Tool'}`,
        t.description,
        `/${t.slug}`,
        t.available,
      )
    : {};
}
export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const slug = (await params).tool;
  if (isRemoteTool(slug)) await connection();
  const catalog = serverTools();
  const t = catalog.find((t) => t.slug === slug);
  if (!t) notFound();
  const related = catalog
    .filter((other) => other.available && other.category === t.category && other.slug !== t.slug)
    .slice(0, 3);
  return (
    <main id="main" className="tool-page container">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'PDF tools', path: '/tools' },
          { name: t.name, path: `/${t.slug}` },
        ])}
      />
      {t.available && (
        <StructuredData
          data={{
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: `Folio ${t.name}`,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Web browser',
            url: `${siteUrl}/${t.slug}`,
            description: t.description,
            ...(t.premium
              ? {}
              : { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }),
          }}
        />
      )}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={12} />
        <Link href="/tools">All tools</Link>
        <ChevronRight size={12} />
        <span aria-current="page">{t.name}</span>
      </nav>
      <div className="tool-page-heading">
        <span className={`tool-icon ${t.color}`}>
          <ToolIcon name={t.icon} size={28} />
        </span>
        <h1>
          {t.name}
          <span className="accent-dot">.</span>
        </h1>
        <p>{t.description}</p>
        {t.premium && t.available ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} />
              {isRemoteTool(t.slug) ? 'Connected document service' : 'Processed on Folio'}
            </span>
            <i />
            {t.slug === 'protect-pdf' ? 'Keep your original file' : 'Review before downloading'}
          </div>
        ) : t.available ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} />
              {editorTools.includes(t.slug)
                ? 'Private cloud saving in the editor'
                : 'On your device'}
            </span>
            <i />
            No sign-up needed
            <i />
            Free to use
          </div>
        ) : (
          <span className="status-label">COMING SOON</span>
        )}
      </div>
      {t.processor === 'image' ? (
        <ImageWorkbench key={t.slug} tool={t} />
      ) : t.processor === 'qr' ? (
        <QrWorkbench />
      ) : t.slug === 'edit-pdf-text' ? (
        <ProTextEditor />
      ) : t.slug === 'protect-pdf' ? (
        <ProtectPdf />
      ) : isRemoteTool(t.slug) ? (
        <RemotePdfWorkspace
          key={t.slug}
          tool={t.slug}
          initialReady={t.available}
          provider={conversionProvider()}
        />
      ) : t.available ? (
        <ToolProcessor key={t.slug} tool={t} />
      ) : (
        <div className="unavailable-panel">
          <span className={`tool-icon ${t.color}`}>
            <ToolIcon name={t.icon} size={32} />
          </span>
          <h2>A new format is on the way.</h2>
          <p>{t.detail}</p>
          <Link href="/convert" className="button dark">
            Explore available converters <ArrowRight size={17} />
          </Link>
          <small>This tool will be enabled when its conversion service is connected.</small>
        </div>
      )}
      <section className="how-to-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THREE SIMPLE STEPS</span>
            <h2>
              {t.slug === 'edit-pdf-text'
                ? 'How to edit text in a PDF.'
                : `How to ${t.name.toLowerCase()}.`}
            </h2>
          </div>
        </div>
        <ol className="steps-grid">
          {t.steps.map((s, i) => (
            <li key={s}>
              <span>0{i + 1}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="tool-details">
        <div>
          <span className="eyebrow">A FEW HELPFUL DETAILS</span>
          <h2>
            Know your document.
            <br />
            <em>Get a better result.</em>
          </h2>
          <p>{t.detail}</p>
        </div>
        <Faq items={t.faq} />
      </section>
      {related.length > 0 && (
        <section className="related-tools">
          <div className="section-heading">
            <h2>What’s next for your document?</h2>
            <Link href="/tools" className="text-link">
              All tools <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="related-grid">
            {related.map((r) => (
              <Link key={r.slug} href={`/${r.slug}`}>
                <span className={`tool-icon ${r.color}`}>
                  <ToolIcon name={r.icon} />
                </span>
                <span>
                  <strong>{r.name}</strong>
                  <small>{r.short}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
