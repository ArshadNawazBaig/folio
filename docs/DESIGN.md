# Folio interface patterns

Keep the warm paper surfaces, terracotta actions, sage accents, Manrope interface text, and DM Serif Display editorial headings. Shared styles live in `src/app/globals.css`; dashboard, blog, and signature layouts use CSS modules.

## Notices and form actions

- Use `service-note` for contextual guidance, `error-message` for failures, and `pro-notice` for success feedback. Status messages need `role="status"`; errors need `role="alert"`.
- Standalone notices have a complete border, rounded corners, readable text, and vertical spacing. Do not reset their spacing through a broad card paragraph selector.
- Use `service-note--footer` only for a notice intentionally attached to the bottom of a tool workspace. Its flat edge is part of that container.
- Use `form-actions` for a form's final guidance and primary action. It separates the controls with a border and a 16px gap. Explain unavailable actions next to their buttons; associate the explanation with `aria-describedby` where appropriate.
- Keep processing errors inset with `processor-message error-message`. Editor notifications retain their separate bottom-center toast layout.

## Dialogs

Confirmation dialogs use a native `dialog` with `confirm-dialog` or `admin-confirm`, containing `dialog-header`, `dialog-body`, and `dialog-footer`. A form spanning body and footer uses `dialog-form`.

Only the body scrolls. Keep the heading, close control, and footer visible within 80% of the viewport; short confirmations use their natural height. Label each dialog with its heading. Busy operations must preserve their existing dismissal rules.

The download, signature, and blog dialogs have specialized content but follow the same fixed header/footer structure, warm surface, rounded frame, and dimmed backdrop. Tool search also keeps its input and footer visible while results scroll.

## Navigation and responsive behavior

`AdminNavigation` is shared by administration and blog management. Its destinations are defined in `src/lib/admin-navigation.ts`. Admin views use `?view=` URLs, so links from blog management and refreshes return to the selected screen. Dashboard and admin navigation bring the active item into view on narrow screens.

Search controls use rounded outlines and an obvious focus state. Long button labels wrap. Mobile admin forms stack paired fields and use 16px input text to avoid browser zoom when focusing a field. Data tables retain horizontal scrolling inside their cards.

## Verification

Run `npm run test:design` for the isolated visual and interaction checks. The test server uses fixture accounts on port 3001 and does not contact real billing or private storage. Screenshots are written to the ignored `test-results-design/` directory.

The design checks cover every public tool landing page and the home, tools, convert, forms, pricing, support, sign-in, about, privacy, guides, and blog pages at desktop and mobile widths. They check notice spacing, search scrolling, admin navigation and confirmation dialogs, dashboard dialogs, narrow screens down to 320px, and accessibility on representative states.

Use the existing app, dropdown, editor toolbar, signature, editor error, authenticated account, and public blog suites to verify working documents, saving, checkout handoffs, loading/error states, blog publishing, and SEO after shared style changes. Passing fixture tests does not validate live payment-provider configuration.
