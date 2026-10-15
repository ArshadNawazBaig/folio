import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ToolIcon } from '@/components/icon';
import { FormTemplates } from '@/components/form-templates';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'PDF Forms — Fill, Sign & Create Fillable Forms',
  'Fill and sign a PDF, create your own fillable text fields and checkboxes, or start with an original Folio form template.',
  '/forms',
);
export default function FormsPage({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  return (
    <main id="main" className="container forms-page with-page-heading">
      <div className="directory-heading page-heading">
        <span className="eyebrow">{tr('LET’S FILL IN THE BLANKS')}</span>
        <h1>
          {tr('Fill, sign and create')}
          <br />
          <em>{tr('PDF forms.')}</em>
        </h1>
        <p>
          {tr(
            'Fill and sign a PDF, create your own fillable text fields and checkboxes, or start with an original Folio form template.',
          )}
        </p>
      </div>
      <div className="form-entry-grid">
        {[
          [
            'signature-generator',
            'sign',
            'Create a signature PNG',
            'Draw or type. Download with a transparent background.',
          ],
          [
            'sign-pdf',
            'sign',
            'Fill & sign a PDF',
            'Fill existing fields or place text on a flat page, then add a visual signature.',
          ],
          [
            'create-pdf-form',
            'form',
            'Create a fillable PDF',
            'Create fillable text fields and checkboxes in your PDF. Export an interactive form or a flattened copy.',
          ],
          [
            'forms#templates',
            'pages',
            'Find a template',
            'Original Folio templates for everyday use. These are sample documents, not official or legal forms.',
          ],
        ].map(([slug, icon, title, desc]) => (
          <Link href={href(`/${slug}`)} key={slug}>
            <span className="tool-icon">
              <ToolIcon name={icon} size={25} />
            </span>
            <h2>
              {tr(title)}
              <ArrowUpRight size={17} />
            </h2>
            <p>{tr(desc)}</p>
          </Link>
        ))}
      </div>
      <section className="content-decisions" aria-labelledby="form-export-title">
        <h2 id="form-export-title">{tr('Choose how your finished form works')}</h2>
        <div className="tool-reading-grid">
          <Link href={href('/guides/fillable-pdf-vs-flattened-pdf')}>
            <strong>{tr('Keep fields editable')}</strong>
            <span>
              {tr(
                'Leave “Flatten fields when exporting” unchecked when someone still needs to enter answers. Download the PDF, reopen it in a form-capable reader, and test a text field and checkbox before distributing it.',
              )}
            </span>
          </Link>
          <Link href={href('/guides/fillable-pdf-vs-flattened-pdf')}>
            <strong>{tr('Create a completed copy')}</strong>
            <span>
              {tr(
                'Check “Flatten fields when exporting” to turn completed fields into page content. Save an editable copy first. Flattening removes the form controls; it does not prevent all PDF editing or securely remove sensitive information.',
              )}
            </span>
          </Link>
        </div>
        <p>
          {tr(
            'A drawn, typed or uploaded signature is a visual mark. Folio does not add certificate-based signing or verify the signer’s identity. Confirm the recipient’s requirements before sending the file.',
          )}
        </p>
      </section>
      <section id="templates" className="templates-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{tr('A BLANK PAGE, WITH A HEAD START')}</span>
            <h2>{tr('Find a template')}</h2>
          </div>
          <p>{tr('Simple templates. Ready for your details.')}</p>
        </div>
        <FormTemplates />
      </section>
    </main>
  );
}
