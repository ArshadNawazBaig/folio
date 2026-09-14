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
export default function FormsPage() {
  return (
    <main id="main" className="container forms-page">
      <div className="directory-heading">
        <span className="eyebrow">LET’S FILL IN THE BLANKS</span>
        <h1>
          A better way
          <br />
          <em>to get it in writing.</em>
        </h1>
        <p>
          A form to fill. A signature to add. A fresh place to start.
          <br />
          Bring a little order to the everyday.
        </p>
      </div>
      <div className="form-entry-grid">
        {[
          ['sign-pdf', 'sign', 'Fill & sign a PDF', 'A few details and your finishing touch.'],
          [
            'create-pdf-form',
            'form',
            'Create a fillable PDF',
            'Good questions deserve a good form.',
          ],
          ['forms#templates', 'pages', 'Find a template', 'Start a little further ahead.'],
        ].map(([slug, icon, title, desc]) => (
          <Link href={`/${slug}`} key={slug}>
            <span className="tool-icon sage">
              <ToolIcon name={icon} size={25} />
            </span>
            <h2>
              {title}
              <ArrowUpRight size={17} />
            </h2>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
      <section id="templates" className="templates-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A BLANK PAGE, WITH A HEAD START</span>
            <h2>Make yourself at home.</h2>
          </div>
          <p>Simple templates. Ready for your details.</p>
        </div>
        <FormTemplates />
      </section>
    </main>
  );
}
