import { translator, type PageLanguage } from '@/lib/i18n/translate';
import { SupportPanel } from '@/components/support-panel';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Contact Folio support',
  'Get help with PDF tools, downloads, saved files, or your account. Learn what to include in a report and where to find replies.',
  '/support',
  false,
);
export default function SupportPage({ messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);

  return (
    <main id="main" className="container support-page with-page-heading">
      <div className="support-heading page-heading">
        <span className="eyebrow">{tr('A HUMAN QUESTION DESERVES AN ANSWER')}</span>
        <h1>
          {tr('A little help,')}
          <br />
          <em>{tr('right when you need it.')}</em>
        </h1>
        <p>
          {tr(
            'Get help with a PDF tool, a download, saved work, or your account. Describe the task you were trying to finish and the point where it stopped working.',
          )}
        </p>
      </div>
      <SupportPanel />
      <section className="prose-page" aria-labelledby="support-report-details">
        <h2 id="support-report-details">{tr('What to include in your report')}</h2>
        <ul>
          <li>
            {tr(
              'Name the tool and list the steps that led to the problem, including the exact error message.',
            )}
          </li>
          <li>
            {tr(
              'Include your browser and device, the file type and approximate size, and whether the problem appears in the preview or the downloaded file.',
            )}
          </li>
          <li>
            {tr(
              'For saved work, say whether you were signed in or using a guest workspace and whether the editor showed “All changes saved”.',
            )}
          </li>
        </ul>
        <p>
          {tr(
            'Describe the issue without including passwords, payment details, or confidential document contents. A fictional example is enough to explain the steps.',
          )}
        </p>
        <h2>{tr('Where to find the reply')}</h2>
        <p>
          {tr(
            'You can submit an inquiry without signing in. To read replies and continue the conversation, sign in with the same email address used for the inquiry and return to this page. Email notifications are not currently sent.',
          )}
        </p>
      </section>
    </main>
  );
}
