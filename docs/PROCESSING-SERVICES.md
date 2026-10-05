# Document processing services

Updated October 5, 2026: the owner removed PDF translation and PDF-to-Word, Excel, and PowerPoint because ongoing external processing costs money. Folio now offers 28 tools.

The CloudConvert, ConvertAPI, and Google Cloud Translation adapters and their workspace were removed. The old English and translated tool routes return 404 and are excluded from navigation, search, editor handoffs, metadata, and the sitemap. `/api/documents/process` returns 410 before reading an upload or making any provider call. Older clients receive false capability flags even if previous credentials are still configured.

No external conversion or document-translation API account is needed. Existing Google sign-in and Supabase storage are separate features and remain in use. Hosting and storage still have their own operating costs.

Legacy encrypted result exports and recovery records remain readable under their existing expiry and access rules. Keep `DOCUMENT_RESULT_KEY` while those records need to be read. This key does not enable processing or incur external API charges. Existing saved files are not deleted by this change.

Provider environment variables are no longer read by the application. They may be removed from deployment configuration separately; do not remove Google OAuth credentials used for sign-in.
