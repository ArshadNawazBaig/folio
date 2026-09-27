# Folio interface patterns

Use the approved charcoal-and-orange design: charcoal navigation and workspace chrome, white and neutral-gray surfaces, bold Manrope headings, orange primary actions with dark labels, and thin neutral borders. Shared tokens and interface styles live in `src/app/globals.css`; the home page, editor preview, dashboard, blog, and specialized dialogs use CSS modules.

- Keep the existing `Logo` component, its artwork, wordmark, and favicon assets. Use its existing `light` variant on charcoal surfaces. Its original accent is scoped inside `.logo` so interface palette changes do not recolor the brand.
- Use `--accent` for primary action backgrounds and accents on dark surfaces; use `--accent-text` for readable orange text on light surfaces. Use `--accent-soft` for selected tools and icon tiles.
- Use `--surface`, `--paper`, `--surface-muted`, and `--border` for neutral surfaces. Keep semantic error and success states distinguishable.
- The home page uses a compact upload bar and a searchable toolkit. Search within Popular covers the entire catalog; other filters narrow the results by task. Keep unavailable-service labels and free/Pro download explanations visible.
- Keep document content, user-selected text colors, signatures, and PDF rendering independent of interface colors and typography.
- Use `--text-body` (15px) for body copy and section descriptions on desktop and mobile, with the hero description scaling to 17px on desktop. Use `--text-control` (15px) for primary controls and navigation, `--text-label` (14px) for labels, and `--text-small` (13px) for supporting text. Reserve `--text-caption` (12px) for compact metadata and editor chrome. Text fields use `--text-input` (16px) to avoid mobile focus zoom. Keep headings larger and allow layouts to wrap instead of shrinking text on narrow screens. Miniature document illustrations keep their own scale.

## Notices and form actions

- Use `service-note` for contextual guidance, `error-message` for failures, and `pro-notice` for success feedback. Status messages need `role="status"`; errors need `role="alert"`.
- Standalone notices have a complete border, rounded corners, readable text, and vertical spacing. Do not reset their spacing through a broad card paragraph selector.
- Use `service-note--footer` only for a notice intentionally attached to the bottom of a tool workspace. Its flat edge is part of that container.
- Use `form-actions` for a form's final guidance and primary action. It separates the controls with a border and a 16px gap. Explain unavailable actions next to their buttons; associate the explanation with `aria-describedby` where appropriate.
- Keep processing errors inset with `processor-message error-message`. Editor notifications retain their separate bottom-center toast layout.

## Dialogs

Confirmation dialogs use a native `dialog` with `confirm-dialog` or `admin-confirm`, containing `dialog-header`, `dialog-body`, and `dialog-footer`. A form spanning body and footer uses `dialog-form`.

Only the body scrolls. Keep the heading, close control, and footer visible within 80% of the viewport; short confirmations use their natural height. Label each dialog with its heading. Busy operations must preserve their existing dismissal rules.

The download, signature, and blog dialogs have specialized content but follow the same fixed header/footer structure, white surface, rounded frame, and dimmed backdrop. Tool search also keeps its input and footer visible while results scroll.

## Navigation and responsive behavior

`AdminNavigation` is shared by administration and blog management. Its destinations are defined in `src/lib/admin-navigation.ts`. Admin views use `?view=` URLs, so links from blog management and refreshes return to the selected screen. Dashboard and admin navigation bring the active item into view on narrow screens.

Search controls use rounded outlines and an obvious focus state. Long button labels wrap. Mobile admin forms stack paired fields and use 16px input text to avoid browser zoom when focusing a field. Data tables retain horizontal scrolling inside their cards.

Public footer copy, links, headings, and copyright text use `--text-control`, matching navbar link text at every viewport size.

## Verification

Run `npm run test:design` for the isolated visual and interaction checks. The test server uses fixture accounts on port 3001 and does not contact real billing or private storage. Screenshots are written to the ignored `test-results-design/` directory.

The design checks cover every public tool landing page and the home, tools, convert, forms, pricing, support, sign-in, about, privacy, guides, and blog pages at desktop and mobile widths. They check notice spacing, search scrolling, admin navigation and confirmation dialogs, dashboard dialogs, narrow screens down to 320px, and accessibility on representative states.

Use the existing app, dropdown, editor toolbar, signature, editor error, authenticated account, and public blog suites to verify working documents, saving, checkout handoffs, loading/error states, blog publishing, and SEO after shared style changes. Passing fixture tests does not validate live payment-provider configuration.
