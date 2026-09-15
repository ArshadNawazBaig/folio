import { Pricing } from '@/components/pricing';
import { Faq } from '@/components/faq';
import { pageMetadata } from '@/lib/seo';
import { getPlatform } from '@/lib/server/platform';
import { money, offerTerms } from '@/lib/platform';
import { serverTools, isRemoteTool } from '@/lib/server/tool-catalog';
import { availablePremiumToolNames } from '@/lib/tool-access';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { catalog } = await getPlatform();
  return pageMetadata(
    `${catalog.name} Pricing — ${money(catalog.monthlyAmount)}/Month`,
    `${offerTerms(catalog, catalog.trialEnabled ? 'trial' : 'month')} Edit and preview for free; Pro downloads require a subscription.`,
    '/pricing',
  );
}
export default async function PricingPage() {
  const { catalog } = await getPlatform();
  const toolCatalog = serverTools();
  const availableTools = availablePremiumToolNames(toolCatalog);
  const additionalPremiumTools = availablePremiumToolNames(
    toolCatalog.filter((tool) => isRemoteTool(tool.slug)),
  );
  const unavailableTools = toolCatalog
    .filter((tool) => tool.premium && !tool.available)
    .map((tool) => tool.name);
  return (
    <main id="main" className="container pricing-page">
      <div className="pricing-heading">
        <span className="eyebrow">A PLAN FOR YOUR PAPERWORK</span>
        <h1>
          Start with the essentials.
          <br />
          <em>Make room for more.</em>
        </h1>
        <p>
          Everyday PDF tools are free. Edit and preview with Pro tools at no charge, then choose a
          plan when you download your finished file.
        </p>
      </div>
      <Pricing initialCatalog={catalog} additionalPremiumTools={additionalPremiumTools} />
      <section className="pricing-faq">
        <h2>A few things, made clear.</h2>
        <Faq
          items={[
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
              `Available now: ${availableTools.join(', ')}.${unavailableTools.length ? ` Currently unavailable: ${unavailableTools.join(', ')}. These are not available to subscribers yet; check their tool pages before buying a plan for them.` : ''} Standalone OCR, RTF/EPUB conversion, reverse Office conversion, transcription, and media conversion are planned and are not currently included as available tools.`,
            ],
            [
              'How does the introductory offer work?',
              catalog.trialEnabled
                ? `${offerTerms(catalog, 'trial')} The introductory offer is available once per account and starts when checkout creates your subscription. It includes all Pro features.`
                : 'An introductory offer is not currently available. Choose monthly billing to access Pro downloads.',
            ],
            [
              'Can I choose monthly billing straight away?',
              `Yes. ${offerTerms(catalog, 'month')} Monthly billing starts immediately without an introductory period.`,
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
          ]}
        />
      </section>
    </main>
  );
}
