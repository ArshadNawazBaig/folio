import { FREE_LAUNCH } from '@/lib/access-policy';
import type { Tool } from '@/lib/tools';
import {
  translator,
  localizedHref,
  localizeTool,
  localizeSummary,
  type PageLanguage,
} from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, ShieldCheck, ArrowRight } from 'lucide-react';
import { editorTools } from '@/lib/tools';
import { serverTools } from '@/lib/server/tool-catalog';
import { ToolIcon } from '@/components/icon';
import { ToolInteractive } from '@/components/tool-interactive';
import { Faq } from '@/components/faq';
import { ToolFacts } from '@/components/tool-facts';
import { ToolExample } from '@/components/tool-example';
import { StructuredData } from '@/components/structured-data';
import { breadcrumbSchema, siteUrl } from '@/lib/seo';
import { guidesForTool, relatedTools } from '@/lib/related-content';
export function ToolPageContent({
  tool: original,
  locale = 'en',
  messages = {},
}: PageLanguage & { tool: Tool }) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const t = localizeTool(original, messages);
  const catalog = serverTools();
  const related = relatedTools(original, catalog).map((tool) => localizeSummary(tool, messages));
  const reading = guidesForTool(t.slug);
  return (
    <main id="main" className="tool-page container with-page-heading">
      <StructuredData
        data={breadcrumbSchema([
          { name: tr('Home'), path: href('/') },
          { name: tr('Tools'), path: href('/tools') },
          { name: t.name, path: href(`/${t.slug}`) },
        ])}
      />
      {t.available && (
        <StructuredData
          data={{
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            '@id': `${siteUrl}${href(`/${t.slug}`)}#software`,
            name: `Folio ${t.name}`,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Web browser',
            inLanguage: locale,
            url: `${siteUrl}${href(`/${t.slug}`)}`,
            description: t.description,
            publisher: { '@id': `${siteUrl}/#organization` },
            ...(!FREE_LAUNCH && t.premium
              ? {}
              : { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }),
          }}
        />
      )}

      <div className="tool-page-heading page-heading">
        <nav className="breadcrumbs" aria-label={tr('Breadcrumb')}>
          <Link href={href('/')}>{tr('Home')}</Link>
          <ChevronRight size={12} />
          <Link href={href('/tools')}>{tr('All tools')}</Link>
          <ChevronRight size={12} />
          <span aria-current="page">{t.name}</span>
        </nav>
        <span className="tool-icon">
          <ToolIcon name={t.icon} size={28} />
        </span>
        <h1>
          {t.slug === 'edit-pdf' ? tr('Free PDF editor') : t.name}
          <span className="accent-dot">{tr('.')}</span>
        </h1>
        <p>{t.description}</p>
        {t.slug === 'sign-pdf' && (
          <Link href={href('/signature-generator')} className="text-link">
            {tr('Just need a signature image? Create a transparent PNG')} <ArrowUpRight size={15} />
          </Link>
        )}
        {t.processor === 'invoice' ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} /> {tr('Free PDF downloads')}
            </span>
            <i /> {tr('Live invoice preview')}
            <i /> {tr(FREE_LAUNCH ? 'All designs included' : 'Optional Pro features')}
          </div>
        ) : t.processor === 'shortener' ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} />
              {tr('Saved to your account')}
            </span>
            <i />
            {tr(FREE_LAUNCH ? 'All options are free' : 'Free & Pro plans')}
            <i />
            {tr('QR downloads included')}
          </div>
        ) : ['edit-pdf-text', 'protect-pdf'].includes(t.slug) && t.available ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} />
              {tr('Processed on Folio')}
            </span>
            <i />
            {t.slug === 'protect-pdf'
              ? tr('Keep your original file')
              : tr('Review before downloading')}
          </div>
        ) : t.available ? (
          <div className="tool-benefits">
            <span>
              <ShieldCheck size={14} />
              {editorTools.includes(t.slug)
                ? tr('Private cloud saving in the editor')
                : tr('On your device')}
            </span>
            <i />
            {tr('No sign-up needed')}
            <i />
            {tr('Free to use')}
          </div>
        ) : (
          <span className="status-label">{tr('COMING SOON')}</span>
        )}
      </div>
      {t.available ? (
        <ToolInteractive key={t.slug} tool={t} />
      ) : (
        <div className="unavailable-panel">
          <span className="tool-icon">
            <ToolIcon name={t.icon} size={32} />
          </span>
          <h2>{tr('A new format is on the way.')}</h2>
          <p>{t.detail}</p>
          <Link href={href('/convert')} className="button dark">
            {tr('Explore available converters')} <ArrowRight size={17} />
          </Link>
          <small>{tr('This tool will be enabled when its conversion service is connected.')}</small>
        </div>
      )}
      <ToolFacts tool={t} locale={locale} messages={messages} />
      <section className="how-to-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{tr('THREE SIMPLE STEPS')}</span>
            <h2>
              {t.slug === 'edit-pdf-text'
                ? tr('How to edit text in a PDF.')
                : tr('{name}: step by step.', { name: t.name })}
            </h2>
          </div>
        </div>
        <ol className="steps-grid">
          {t.steps.map((s, i) => (
            <li key={s}>
              <span>
                {tr('0')}
                {i + 1}
              </span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
      </section>
      {locale === 'en' && t.available && <ToolExample slug={t.slug} />}
      <section className="tool-details">
        <div>
          <span className="eyebrow">{tr('A FEW HELPFUL DETAILS')}</span>
          <h2>
            {t.processor === 'invoice'
              ? tr('Make getting paid simpler.')
              : t.processor === 'signature'
                ? tr('Make your mark.')
                : t.processor === 'shortener'
                  ? tr('Make every link count.')
                  : tr('Know your document.')}
            <br />
            <em>{tr('Get a better result.')}</em>
          </h2>
          <p>{t.detail}</p>
        </div>
        <Faq items={t.faq} />
      </section>
      {reading.length > 0 && (
        <section className="tool-reading" aria-labelledby="tool-reading-title">
          <span className="eyebrow">{tr('HELP FOR YOUR NEXT STEP')}</span>
          <h2 id="tool-reading-title">{tr('Get more from {name}.', { name: t.name })}</h2>
          <div className="tool-reading-grid">
            {reading.map((guide) => (
              <Link key={guide.slug} href={href(`/guides/${guide.slug}`)}>
                <strong>
                  {tr(guide.title)} <ArrowUpRight size={16} />
                </strong>
                <span>{tr(guide.description)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="related-tools">
          <div className="section-heading">
            <h2>{tr('What would you like to do?')}</h2>
            <Link href={href('/tools')} className="text-link">
              {tr('All tools')} <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="related-grid">
            {related.map((r) => (
              <Link key={r.slug} href={href(`/${r.slug}`)}>
                <span className="tool-icon">
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
