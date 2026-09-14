# PDF editing fonts

Original static Geist faces come from [vercel/geist-font](https://github.com/vercel/geist-font/tree/10dc7658f13c38a474cde201bb09a4617267545b/fonts). See LICENSE-Geist.txt for redistribution terms.

Liberation Sans, Serif and Mono (regular, bold, italic and bold italic) come from the official [Liberation Fonts 2.1.5 release](https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5), using its `liberation-fonts-ttf-2.1.5.tar.gz` asset. See LICENSE-Liberation.txt for redistribution terms.

Known Geist and Liberation subsets use the complete matching family and style when new characters are needed. For other fonts, only missing characters use a Liberation face matched by category, weight and italic style; existing glyphs retain their embedded font. Matching is approximate when the original complete font is unavailable. Browser typing and PDF export use these same local assets. Documents are never sent to a font provider.

The original-text editor currently accepts single-line Latin replacement text. Adding these fonts does not add OCR or support for every writing system. Deployment tracing includes the font programs and licenses for both document saving and PDF processing routes.

The application interface uses `next/font/google` for Manrope and DM Serif Display. That loader provides browser CSS and self-hosted web fonts; it cannot supply the raw TrueType programs required by PDFium or load arbitrary fonts embedded in uploaded PDFs. These licensed PDF font assets therefore remain separate so the live edit and downloaded document use consistent glyphs.
