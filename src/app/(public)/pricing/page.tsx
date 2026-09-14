import { Pricing } from '@/components/pricing';
import { Faq } from '@/components/faq';
import { pageMetadata } from '@/lib/seo';
import { getPlatform } from '@/lib/server/platform';
import { money, offerTerms } from '@/lib/platform';
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
          plan when you download your finished PDF.
        </p>
      </div>
      <Pricing initialCatalog={catalog} />
      <section className="pricing-faq">
        <h2>A few things, made clear.</h2>
        <Faq
          items={[
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
              'Yes. Pro replaces supported text objects in the PDF. It works one text block at a time and does not automatically reflow paragraphs. Embedded fonts may be replaced with a standard font. Scanned images, text inside artwork, clipped text, and some complex layouts are not supported.',
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
              'Are translation and OCR included?',
              'Connected translation and Office conversion tools offer Pro downloads. Their current availability is shown in the tool directory and on each tool page; check it before subscribing. Standalone OCR is not included.',
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
