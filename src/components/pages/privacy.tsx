import { translator, type PageLanguage } from '@/lib/i18n/translate';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Your Privacy — How Folio Handles Documents',
  'Understand private document uploads, automatic workspace saving, guest recovery, and deletion in Folio.',
  '/privacy',
);
export default function Privacy({ messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);

  return (
    <main id="main" className="container prose-page with-page-heading">
      <header className="page-heading">
        <span className="eyebrow">{tr('YOUR DOCUMENTS. YOUR BUSINESS.')}</span>
        <h1>
          {tr('A little clarity')}
          <br />
          <em>{tr('about your privacy.')}</em>
        </h1>
        <p>
          {tr(
            'This page describes how the current version of Folio handles documents and saved links. Updated September 29, 2026.',
          )}
        </p>
      </header>
      <h2>{tr('Invoice saving is your choice.')}</h2>
      <p>
        {tr(
          'Invoice drafts stay in the current tab until you download a draft backup or explicitly choose Save to account. Free PDF exports are generated in your browser. Premium exports send the invoice details, logo, and payment instructions to Folio for processing in server memory; exporting does not create a saved invoice record. Hosting infrastructure may buffer requests. No invoice content is automatically saved in browser storage.',
        )}
      </p>
      <p>
        {tr(
          'Save to account stores the full invoice, including customer details, logos, and payment instructions, in a private Supabase record. Pro accounts can keep up to 200 invoices. Only the owning account can read and manage its library through the application. Authorized service operators retain infrastructure access. You can read and delete saved invoices after Pro ends; creating or updating saved invoices requires current Pro access. Deleting an account removes its saved invoice records. PDF and JSON files downloaded to your device are separate copies. Folio does not send invoices or collect customer payments.',
        )}
      </p>
      <h2>{tr('Standalone signature images stay in your tab.')}</h2>
      <p>
        {tr(
          'The signature generator processes your typed name, drawing, and chosen image in the current browser tab. It does not upload or save signature content to Folio or browser storage. Clearing the tool or refreshing discards the working signature. PNG files you download remain on your device. Website and font requests still use the network. If you later add a signature to a PDF in the editor, that document uses the private cloud saving described below.',
        )}
      </p>
      <h2>{tr('Image compression does not upload or save your images.')}</h2>
      <p>
        {tr(
          'The image compressor reads and processes selected images in the current browser tab. Source images, previews, and compressed results are not uploaded to Folio or written to browser storage. Clear all or refresh to discard the batch. Images or ZIPs you download remain on your device. The website still loads its scripts and other assets over the network.',
        )}
      </p>
      <h2>{tr('Editing can run in your browser while files save privately.')}</h2>
      <p>
        {tr(
          'The free PDF annotation, organizing, form, image conversion, and text extraction tools process files in your browser. The main editor separately uploads each opened PDF to private Supabase Storage so refreshing can restore your work.',
        )}
      </p>
      <h2>{tr('Some tools use server processing.')}</h2>
      <p>
        {tr(
          'The PDF text editor and password protection tool send your PDF to Folio when you explicitly start processing. Password protection also sends the chosen opening password. These operations hold the file and password in memory in a separate processing process; the application does not write them to a document database or object storage. The process is discarded after completion or timeout. Downloaded results are returned to your browser. Hosting infrastructure may buffer requests while processing them.',
        )}
      </p>
      <h2>{tr('Accounts and billing use Supabase and Lemon Squeezy.')}</h2>
      <p>
        {tr(
          'When connected, Supabase handles Google and email sign-in and stores account, subscription, and processing-count records. The browser stores authentication tokens so you can remain signed in. Lemon Squeezy hosts checkout and the billing portal and handles payment information; Folio does not collect card numbers. These services receive the information needed to provide sign-in and payments. Google supplies your basic profile and email when you choose Google sign-in; Folio does not request access to Google Drive or Gmail. Your PDF is never sent to Lemon Squeezy. Signed-in checkout recovery saves the source PDF and edits to private Supabase Storage.',
        )}
      </p>
      <h2>{tr('The main editor saves your workspace automatically.')}</h2>
      <p>
        {tr(
          'Opening a PDF in the editor uploads its source to private Supabase Storage. Edit instructions, added images, form values, text changes, page order, and the current page are saved to the private document record in Supabase. Files and edits are accessible only through the owning account or guest session. Authorized service operators retain infrastructure access.',
        )}
      </p>
      <p>
        {tr(
          'Guest workspaces expire after 24 hours. An HttpOnly session cookie lets the same browser recover them after refresh; clearing cookies removes that access. Signing in attaches the open workspace to your account and removes the guest expiry. Account files remain until deleted from My files. Editor drafts are saved to private cloud storage. Wait for the editor to show “All changes saved” before refreshing; interrupted uploads and unsaved changes may not be recoverable. Expired guest objects are removed by scheduled cleanup, with a two-hour grace period for upload tokens and retries when storage is unavailable.',
        )}
      </p>
      <p>
        {tr(
          'Moving a selected PDF from a translated page to the English editor briefly stores the file in your browser so it survives the page reload. This transfer can be opened once within five minutes and is deleted when the editor reads it. Abandoned transfers are removed on the next transfer after expiry, or when you clear this site’s browser data. This temporary transfer is separate from cloud draft saving.',
        )}
      </p>
      <p>
        {tr(
          'Older browser drafts can be reviewed and moved from My files. A browser copy is removed only after its cloud upload succeeds. Existing browser data remains until you move it or clear site data. Account deletion requests go through dashboard support.',
        )}
      </p>
      <p>
        {tr(
          'At checkout, signed-in users’ text-editing recovery drafts are saved in private Supabase Storage. They contain the source PDF, text inspection, and edits, and are not restored after seven days. Folio attempts to remove the recovery copy after a successful download or when you choose another PDF. Failed deletions may require a retry or operator cleanup. Opening passwords are never saved. Other standalone tools keep guest work in the current tab; the main editor uses the guest recovery described above. Clearing browser data does not remove cloud copies.',
        )}
      </p>
      <h2>{tr('Short links are saved to your account.')}</h2>
      <p>
        {tr(
          'The URL shortener stores destination URLs, titles, aliases, and creation and update dates in Supabase. Only your account can list and manage its links. Anyone with a short URL or its QR code can open the destination; shortening does not make a destination private. QR images are generated in your browser. Folio does not record individual click analytics for short links; hosting infrastructure may keep request logs. Creation counters enforce daily and per-minute limits.',
        )}
      </p>
      <p>
        {tr(
          'Deleting a link removes its destination and title and stops the redirect. Account deletion removes saved links and creation counters. Only the alias remains reserved to prevent another account from reusing an old shared address. Existing links keep working after a Pro plan expires unless deleted or the account is suspended.',
        )}
      </p>
      <h2>{tr('Support and administration records.')}</h2>
      <p>
        {tr(
          'Support inquiries store your name, email, message, and conversation in Supabase. Authorized super admins can review inquiries and manage account access, subscriptions, pricing, and site settings. Administrative changes are recorded in an activity log. Replies appear on the support page; email notifications are not currently sent. Support and activity records have no automatic deletion schedule in this version.',
        )}
      </p>
      <h2>{tr('You can remove saved copies.')}</h2>
      <p>
        {tr(
          'Delete a PDF from My files to remove it from your cloud library. A file you downloaded is separate and remains wherever you saved it. Keep downloaded backups of work you want to preserve.',
        )}
      </p>
      <h2>{tr('The website still needs hosting.')}</h2>
      <p>
        {tr(
          'Your browser requests the website, fonts, scripts, and PDF viewer assets from the site’s host. Hosting infrastructure may handle ordinary request information such as IP addresses and browser details. Folio uses Vercel Web Analytics to collect page views and aggregated website usage statistics. The application includes no advertising trackers. Local processing does not send document contents. Automatic editor uploads, dashboard uploads, and text processing send documents to the services described above.',
        )}
      </p>
      <h2>{tr('Translation and Office conversion use document services.')}</h2>
      <p>
        {tr(
          'When their services are connected, choosing Translate sends your PDF through Folio to Google Cloud Translation; choosing an Office conversion sends it to ConvertAPI. The workspace identifies the provider before upload. Folio processes files in memory and requests conversion without provider file storage. Provider infrastructure and service terms govern their processing. Prepared output is encrypted and returned to your browser with a 24-hour download expiry. Translation previews are readable images. At the download prompt, the encrypted file and preview are saved to private cloud storage for signed-in users. Expired copies are not restored; they are replaced by a new recovery draft or removed after a successful download, with operator cleanup for failed deletions. Folio checks paid access on the server before decrypting downloads. Standalone OCR is not included.',
        )}
      </p>
      <h2>{tr('A shared device needs a little care.')}</h2>
      <p>
        {tr(
          'Older browser drafts and open editor tabs can be accessed by someone using the same browser profile. On a shared computer, save your work, sign out, and close your editor tabs when you are done.',
        )}
      </p>
    </main>
  );
}
