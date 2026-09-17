# Safari save recovery — September 17, 2026

The production editor could stop with Safari's raw `Load failed` message after a network request failed. A WebKit run against `thebestfreepdf.com` reproduced this: the PDF reached private storage, but the subsequent workspace request lost its connection. The reported document was approximately 1 MB, with a small workspace snapshot. Its contents were not fetched or modified during investigation.

## Changes

- Retry transient network failures and HTTP 408/500/502/503/504 responses twice, with short backoff. Validation, authentication, quota, revision conflicts, rate limits, and cancellation are not retried automatically.
- Establish the private guest cookie before reserving the document. Losing a reservation response must not create a replacement guest identity.
- Keep the same document ID and save write ID across retries. Existing server idempotency handles responses lost after commit, and the queue still saves newer edits made while a retry is pending.
- Retry upload completion, account claims and saved-state verification. Exhausted network retries display an actionable connection message, preserve edits in the tab, and keep manual retry available. The existing online handler resumes saving when a disconnected browser reconnects.
- Apply the same bounded recovery to text inspection/preview reads and the browser PDF engine download. Include response-body reads in the retry, and stop preview retries immediately on cancellation so an older selection cannot keep sending requests.
- Serve the browser text engine with gzip encoding and a content-hashed URL with immutable caching. Transfer size drops from 4,633,788 to 2,143,350 bytes; decompression preserves the exact library binary. Keep the old asset URL for tabs opened before the update. Live WebKit checks showed slow or reset requests while the old engine was loading; the connection-level cause is not established.
- Correct the browser test storage fixture for WebKit, whose intercepted multipart data omits file contents. The fixture captures the actual browser File for its fake storage origin; production uploads are unchanged.

## Verification

- 15 save/retry unit tests passed, including response loss after commit, edits arriving during recovery, cancelled preview retries, and a connection lost while reading a response body.
- Nine Chromium and nine WebKit browser checks passed for upload recovery, save acknowledgement, refresh recovery, continued editing, and revision conflicts.
- Lint, TypeScript and the isolated production build passed.
- Four connected guest/account browser regressions passed: concurrent tabs, upload/restore, quota enforcement, and claiming guest files after sign-in.
- All six focused Chrome/WebKit recovery checks passed again after the preview follow-up, including saved original text remaining editable after refresh despite a reset preview connection. Lint, TypeScript and the isolated production build passed again.
- Initial recovery deployment `dpl_5hk3h6Y2D1vr2tobyshRd2hWEPAN` recovered a real interrupted workspace PATCH in WebKit. Upload, editing and saving succeeded, and the saved annotation returned after refresh. The live run then exposed an interrupted text-preview request; the follow-up above addresses that separate read path. The synthetic QA document was removed after the check.
- The follow-up deployment `dpl_JCLMor6LXFs9TvErhDiJPhHVeUyi` passed a live WebKit upload/annotate/save/refresh/continued-editing check with a synthetic image PDF of 1,016,252 bytes. A separate text PDF check still exceeded its waiting budget while the uncompressed engine loaded, motivating the compressed-asset change. Both synthetic documents were removed.
- All ten Chrome/WebKit checks passed after the compressed-asset change: exact decompressed byte integrity and cache headers, browser rendering without server previews, interruption during preview recovery, upload retries, and lost save acknowledgements.
- Final deployment: `dpl_DN8B5ugG7CUf5j3jTqP9JfhiVwDg`, aliased to `https://thebestfreepdf.com`. Production serves the compressed engine with the expected gzip, WebAssembly and immutable-cache headers.
- Live WebKit passed the full synthetic text-PDF workflow: upload, original text replacement, added text, manual save confirmation, refresh, and continued editing of the original text. There were no uncaught browser errors. One selection-to-edit measurement was 110 ms; this is a single synthetic smoke measurement, not a general performance guarantee. The temporary QA PDF was deleted successfully.
- The final deployment also passed the separate live WebKit image-PDF workflow with a 1,016,310-byte synthetic file: upload, add text, verified manual save, refresh, and continued annotation editing. The temporary file was deleted successfully. No failed network requests were reported in either final live run.

Network interruption was reproduced; these changes recover from transient interruptions but cannot restore an unavailable internet connection or bypass a browser/network block. No customer files or medical document contents were changed.
