# Mobile downloads

The reported symptom was that tapping Download PDF did nothing. The existing download helper clicked a temporary link after asynchronous PDF processing and immediately reported success. A small sample downloaded in automated WebKit, so the exact failure on the user's phone was not independently reproduced. Browser download acceptance cannot be inferred from a synthetic click.

Mobile and compact screens now receive a shared save dialog after the actual output bytes are ready. Its download link runs directly from a fresh tap; compatible browsers also offer native file sharing, and PDFs can be opened in a separate tab. The editor stays open. Canceling or failing sharing retains the prepared file and its download fallback. Blob URLs remain valid while the dialog is open and are released after closing with a grace period for an in-flight download.

The same helper covers editor, dashboard and standalone-tool downloads. Desktop automatic downloads continue to work. Messages distinguish a prepared file from a requested download, and prepared mobile exports do not clear paid-workflow recovery drafts. Premium export checks still run before any finished file reaches the dialog.

Validation:

- Production build, TypeScript, lint, formatting and diff checks passed.
- Ten download regression cases passed across iPhone WebKit, Android Chromium and desktop Chromium; two mobile-only cases were skipped on desktop. These cover delayed PDF processing, actual exported annotation text, native-share cancellation/failure/success, export errors and premium gating.
- Repeated the export test directly from an active text input in all three browsers; the latest typed text appears in each downloaded PDF.
- Three existing desktop regressions passed for free/premium annotations, editor navigation during downloads, and JPG/ZIP exports. Three tool-access unit tests passed.
- The mobile dialog has no violations in its targeted axe check and no horizontal page overflow. Phone screenshots were reviewed against Folio's existing dialog design.

These are browser-emulation checks. Native operating-system share-sheet outcomes still depend on the chosen app/device; the test suite stubs those outcomes to verify that cancellation and errors do not discard the prepared PDF. No customer PDFs or payment transactions were used.

Deployed to `https://thebestfreepdf.com` as `dpl_9Fs4HQhm2uMPaJ4fBvsPjhEUohrf`. Live checks in iPhone WebKit and Android Chromium emulation successfully downloaded the sample PDF with a newly typed annotation, preserved the open editor and reported no JavaScript page errors. Storage was mocked for these checks; no production documents were created or changed.

Background: [WebKit user activation](https://webkit.org/blog/13862/the-user-activation-api/) and [download attribute behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download).
