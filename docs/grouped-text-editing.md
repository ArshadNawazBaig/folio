# Text inside PDF groups

Some design exports put real text inside Form XObjects and store each letter as a separate object. The old inspector skipped those groups, incorrectly reporting that the supplied resume had no editable text. The updated inspector finds 60 editable lines in that file.

`pdf-text-objects.mjs` traverses nested groups, composes their transforms, checks ancestor clipping, and joins compatible adjacent glyphs on a shared baseline. Existing page-level IDs stay unchanged; nested IDs add an object path, also retained when copying text.

`pdf-form-source.mjs` gives each drawn form instance a private resource before editing. Otherwise changing one shared form can alter its other appearances. PDFium also requires enclosing form streams to be regenerated after nested removals. A marked zero-area path is added to text-containing forms during preparation and removed when the page is changed, marking every enclosing stream dirty. Non-text paint forms are left without these paths to preserve the bounds used to identify gradient lettering. Preparation is cached per source buffer; this does not rasterize the PDF.

Inspection version 4 triggers reinspection of older saved metadata while retaining document edits and annotations. Server validation, copy descriptors, workspace persistence, and Vercel function file tracing accept the new paths and helper modules. Payment/export authorization is unchanged.

The content tokenizer ignores literal strings, hex strings, comments, and property dictionaries. Streams containing inline binary images are left unsupported rather than guessing image boundaries. Existing limits on file size, pages, text blocks, traversal depth, and expanded content remain bounded. This is text editing, not a secure-redaction feature.

Regression coverage uses synthetic documents rather than committing the private resume:

- Single-letter lines, transformed nested groups, original-ink removal, native font/color preservation, and moved text after export/reopening.
- Independent edits to reused forms, multiple nesting levels, copy/paste, and PDF token parsing.
- Browser-worker and server previews, saving, refreshing, and upgrading a previously empty inspection.
- Existing colored/gradient text, clipping, activation, copy/paste, and added-text behavior.

The local verification passed 97 unit tests, 13 browser tests (including the supplied resume), lint, and type checking. `FOLIO_REPRO_PDF` enables the optional private-resume browser reproduction without adding its bytes to the repository.

The production build passed and deployment `dpl_C549ks8ZF3yVhJCqH8C8EyQJFVpR` was published to `https://folio-pdf-kappa.vercel.app` on September 17, 2026. All three live browser checks passed, including the supplied resume and the real server preview endpoint. Browser save/refresh checks use isolated workspace-storage fixtures; no existing customer documents were modified by these tests.
