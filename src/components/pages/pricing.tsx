import { redirect } from 'next/navigation';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { connection } from 'next/server';
import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import { Pricing } from '@/components/pricing';
import { Faq } from '@/components/faq';
import { pageMetadata } from '@/lib/seo';
import { getPlatform } from '@/lib/server/platform';
import { money } from '@/lib/platform';
import { serverTools, isRemoteTool } from '@/lib/server/tool-catalog';
import { localizedOfferTerms } from '@/lib/i18n/format';
import { availablePremiumToolNames } from '@/lib/tool-access';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ locale = 'en', messages = {} }: PageLanguage = {}) {
  await connection();
  const tr = translator(messages);

  if (FREE_LAUNCH)
    return pageMetadata(
      tr('Free tools'),
      tr('All tools are free. Every account includes 1 GB of private storage.'),
      localizedHref(locale, '/tools'),
    );
  const { catalog } = await getPlatform();
  return pageMetadata(
    tr('{name} Pricing — {amount}/Month', {
      name: catalog.name,
      amount: money(catalog.monthlyAmount),
    }),
    `${localizedOfferTerms(catalog, catalog.trialEnabled ? 'trial' : 'month', tr)} ${tr('Free PDF tools, saved short links, and QR codes. Pro adds custom aliases and advanced downloads.')}`,
    localizedHref(locale, '/pricing'),
  );
}
export default async function PricingPage({ locale = 'en', messages = {} }: PageLanguage = {}) {
  if (FREE_LAUNCH) redirect(localizedHref(locale, '/tools'));
  await connection();
  const tr = translator(messages);

  const { catalog } = await getPlatform();
  const toolCatalog = serverTools();
  const availableTools = availablePremiumToolNames(toolCatalog).map((name) => tr(name));
  const additionalPremiumTools = availablePremiumToolNames(
    toolCatalog.filter((tool) => isRemoteTool(tool.slug)),
  );
  const unavailableTools = toolCatalog
    .filter((tool) => tool.premium && !tool.available)
    .map((tool) => tr(tool.name));
  return (
    <main id="main" className="container pricing-page with-page-heading">
      <div className="pricing-heading page-heading">
        <span className="eyebrow">{tr('A PLAN FOR YOUR PAPERWORK')}</span>
        <h1>
          {tr('Start with the essentials.')}
          <br />
          <em>{tr('Make room for more.')}</em>
        </h1>
        <p>
          {tr(
            'Everyday PDF tools, 10 saved short links, and QR downloads are free. Pro adds advanced PDF downloads, custom link aliases, and more room for your work.',
          )}
        </p>
      </div>
      <Pricing initialCatalog={catalog} additionalPremiumTools={additionalPremiumTools} />
      <section className="pricing-faq">
        <h2>{tr('A few things, made clear.')}</h2>
        <Faq
          items={[
            [
              'What is included with the URL shortener?',
              'Sign in to save 10 links on Free or 1,000 on Pro. Both plans include random aliases and PNG/SVG QR downloads. Pro adds custom aliases and destination editing. Existing links keep working when Pro ends; new links must fit the Free limit. You can rename or delete saved links on either plan. Deleted aliases cannot be reused.',
            ],
            [
              'Which downloads are free?',
              'Added text, annotations, signatures, fillable forms, merging, splitting, compression, cropping, page organization, watermarks, and page numbers are free. PDF-to-image conversion, selectable-text extraction, image-to-PDF conversion, JPG/WEBP conversion, image compression, basic photo adjustments, and static QR codes are also free. Free downloads do not receive a Folio watermark.',
            ],
            [
              'When does my edited PDF need a premium plan?',
              'Only when the finished document includes a premium change, such as replacing, deleting, moving, or copying original PDF text, or applying password protection. Opening Edit Text or selecting a text block does not make a free document paid. Undo all original-text changes to return to a free annotation download. Editing and previews remain available before purchase.',
            ],
            [
              'Which premium tools can I use today?',
              tr('Available now: {tools}.', { tools: availableTools.join(', ') }) +
                (unavailableTools.length
                  ? ' ' +
                    tr(
                      'Currently unavailable: {tools}. These are not available to subscribers yet; check their tool pages before buying a plan for them.',
                      { tools: unavailableTools.join(', ') },
                    )
                  : '') +
                ' ' +
                tr(
                  'Standalone OCR, RTF/EPUB conversion, reverse Office conversion, transcription, and media conversion are planned and are not currently included as available tools.',
                ),
            ],
            [
              'How does the introductory offer work?',
              catalog.trialEnabled
                ? tr(
                    '{terms} The introductory offer is available once per account and starts when checkout creates your subscription. It includes all Pro features.',
                    { terms: localizedOfferTerms(catalog, 'trial', tr) },
                  )
                : 'An introductory offer is not currently available. Choose monthly billing to access Pro downloads.',
            ],
            [
              'Can I choose monthly billing straight away?',
              tr(
                'Yes. {terms} Monthly billing starts immediately without an introductory period.',
                { terms: localizedOfferTerms(catalog, 'month', tr) },
              ),
            ],
            [
              'Does Pro really change existing text?',
              'Yes. The editor replaces supported text objects in the PDF. It works one text block at a time and does not automatically reflow paragraphs. Supported embedded fonts, weight, and color are preserved; missing characters use a matching fallback. Scans and outlined letters need other processing. Review complex layouts and font substitutions before downloading.',
            ],
            [
              'Which payment methods are available?',
              'Checkout is hosted by Lemon Squeezy. Available payment methods and the final total are shown there before you confirm a purchase. Folio does not collect your card details.',
            ],
            [
              'Can I cancel?',
              'Use Manage billing in your account to open Lemon Squeezy’s billing portal. Cancellation at the end of a billing period keeps access until the paid period ends. Failed or unpaid renewals do not grant another paid period.',
            ],
            [
              'Will you store my PDFs?',
              'Free processing runs in your browser. The editor automatically uploads PDFs to private storage and saves changes for refresh recovery. Guest workspaces expire after 24 hours; signing in keeps them in your account. Text editing and password protection also use server processing. Opening passwords are never saved.',
            ],
            [
              'Is deleting text secure redaction?',
              'No. Text deletion removes the selected page text object. It does not sanitize metadata, attachments, or other copies of that information. Do not use it for secure redaction.',
            ],
          ].map(([question, answer]) => [tr(question), tr(answer)] as [string, string])}
        />
      </section>
    </main>
  );
}
