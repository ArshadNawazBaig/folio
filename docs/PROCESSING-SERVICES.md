# Processing services for Folio

Recommended setup, reviewed 15 September 2026. Start with CloudConvert and Google Cloud. Add AssemblyAI when the audio/video transcription workflow is ready. Keep Supabase for private user files, identity and application data, and Lemon Squeezy for subscriptions.

## What to create

| Service                                                                                                        | Purpose                                                            | Current Folio integration                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [CloudConvert](https://cloudconvert.com/docs/getting-started/introduction)                                     | Office conversion now; evaluate RTF, EPUB, OCR and media jobs next | PDF to Word, Excel and PowerPoint can use this account.                                         |
| [Google Cloud Translation Advanced](https://docs.cloud.google.com/translate/docs/advanced/translate-documents) | Document translation with a translated PDF output                  | Already implemented; needs a billing-enabled project and service-account credentials.           |
| [AssemblyAI](https://www.assemblyai.com/docs/)                                                                 | Audio/video transcripts, timestamps and speaker labels             | Recommended next service. No transcription adapter or public transcription tool is enabled yet. |

This is an engineering recommendation based on coverage and the existing app, not a claim that any provider wins every quality comparison. Do not purchase a large annual allowance before testing representative documents. Native PDF organization, image conversion/adjustments and QR generation do not need these accounts.

## 1. CloudConvert: connect first

1. Create a CloudConvert account and open its API dashboard.
2. Create an API key with **task.read** and **task.write** scopes. The current adapter does not require account-wide webhook permissions.
3. Add the key to `.env` as `CLOUDCONVERT_API_KEY`. Keep it server-only; never prefix it with `NEXT_PUBLIC_`.
4. Ensure `DOCUMENT_RESULT_KEY` contains 64 random hexadecimal characters. Keep the existing value if it is already configured; rotating it invalidates prepared downloads.
5. Restart local Next.js. In Vercel, add the same server variables to the intended environment and redeploy.
6. Run `npm run check:setup`. The check confirms configuration presence, not key validity or output quality.
7. Test a short native PDF through `/pdf-to-word`, `/pdf-to-excel` and `/pdf-to-powerpoint`. Open the downloaded files in their destination applications. Include a table for Excel and a slide-style document for PowerPoint. Verify paragraph order, fonts, tables, images and links.
8. Review provider credit usage and configure spending controls before public access. Folio's existing `DOCUMENT_DAILY_BUDGET` caps attempts per server instance; it is not a distributed spending limit.

```dotenv
CLOUDCONVERT_API_KEY=
DOCUMENT_RESULT_KEY=
DOCUMENT_DAILY_BUDGET=50
```

CloudConvert takes precedence when its key is configured. The existing `CONVERTAPI_TOKEN` integration remains an optional alternative; a second conversion account is unnecessary. There is no automatic retry through another paid provider after an error.

The current adapter creates a job, waits for its result, verifies the output host and file signature, downloads it on the server, and attempts to delete the provider job. API keys and provider output URLs are not returned to the browser. Errors and cancellation also attempt cleanup once a job ID is known. A failed cleanup or a lost job-creation response may leave provider files until the provider's retention expires. CloudConvert documents automatic deletion 24 hours after a job ends. See its [job API](https://cloudconvert.com/docs/api-reference/jobs).

CloudConvert's sandbox accepts only its whitelisted fixtures. Use the sandbox's supported files to test that environment; it cannot validate arbitrary customer PDFs. Folio's current adapter targets the regular API. Its automated tests mock provider requests and do not spend conversion credits.

## 2. Google Cloud: connect PDF translation

1. Create or choose a Google Cloud project and enable billing.
2. Enable the Cloud Translation API and use **Advanced document translation**.
3. Create a dedicated service account and grant the **Cloud Translation API User** role, or equivalent document-translation permission.
4. Create its credential key using your organization's permitted credential method. For the current Folio adapter, copy `project_id`, `client_email` and `private_key` from the JSON credential into the server variables below. Do not commit the credential file.
5. Add these variables locally and to Vercel, then restart/redeploy. These credentials are separate from the Google OAuth client used for sign-in.
6. Test native PDFs and scanned PDFs separately. Check missing text, translated page count, RTL shaping, overflow and layout with a speaker of the destination language.

```dotenv
GOOGLE_TRANSLATION_PROJECT_ID=
GOOGLE_TRANSLATION_CLIENT_EMAIL=
GOOGLE_TRANSLATION_PRIVATE_KEY=
```

Use a quoted PEM string with literal `\n` separators in a dotenv file. In Vercel, a multiline PEM value is also supported by this app. Folio currently permits 20 pages per translation. Google's [document translation guide](https://docs.cloud.google.com/translate/docs/advanced/translate-documents) explains native/scanned PDF differences; those are quality and service constraints, not something a UI can remove.

## 3. AssemblyAI: when transcription is implemented

Create a project in the AssemblyAI dashboard and obtain a server API key when ready to build and test transcription. The implementation should submit private, temporary audio/video URLs, persist job ownership/status in Supabase, poll or receive authenticated completion events, and let the user correct text before exporting TXT/SRT/VTT. Do not expose a provider transcript ID as the authorization mechanism. See the [transcript API](https://www.assemblyai.com/docs/pre-recorded-audio/api-reference/transcripts/submit).

An AssemblyAI key alone does **not** enable transcription in the current release. No placeholder transcription pages are advertised as working tools.

## Production work needed for the remaining tools

The current remote-document routes use multipart requests and encrypted result payloads. Their application limits are 10 MB input and 20 MB output, but Vercel's request/response body limit is smaller. Do not raise public file limits or launch large-file processing on this path. A short PDF can also produce a large Office output.

Before opening paid remote processing broadly, implement direct private source uploads and durable background jobs, with signed result downloads. Office, media and image source files need their own validated storage types; the existing `folio-documents` bucket and dashboard records are PDF-specific. Count source, output and temporary job storage against the user's quota. Preserve the 24-hour guest expiry and claim guest jobs/files after sign-in. Never rename a media file `.pdf` to bypass storage validation.

CloudConvert explicitly recommends asynchronous jobs for longer work such as video encoding. Configure bounded concurrency, provider quotas, retry rules, idempotent completion handling, ownership checks and deletion of expired temporary files. See [CloudConvert jobs](https://cloudconvert.com/docs/api-reference/jobs) and [Vercel function limits](https://vercel.com/docs/functions/limitations).

Image inpainting for watermark removal and AI super-resolution still need an independently evaluated processing engine. Folio's current image adjustments perform tonal changes and sharpening; they do not invent missing detail. Full 37-tool parity and comparative output quality are not complete. The [tool review](reviews/TOOL-COVERAGE.md) records coverage and acceptance criteria.
