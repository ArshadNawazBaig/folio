# Mobile editor panels

Added labeled Pages and Properties controls above the document on compact screens, with close buttons in both panels. Phone drawers dismiss on outside tap or Escape, return keyboard focus to their toggle, and show one panel at a time. Selecting a page returns to the canvas. Eraser and shape placement no longer reopen Properties on phones; comments, links and form fields still expose the inputs they need. Loading placeholders match the new controls.

Verified in Chromium and WebKit at 320, 390, 768 and 1280 pixels: opening/closing, scrolling while keeping the close button available, focus restoration, page selection, eraser placement and no horizontal page overflow. Desktop sidebars remain visible and the compact controls are hidden. Inspected phone screenshots with the panel open and closed.

Lint, TypeScript and formatting checks passed. Five of six existing font-picker/toolbar checks passed, including mobile font selection and desktop annotation exports in both browsers. The WebKit toolbar accessibility check reports six unnamed Base UI focus guards (`aria-command-name`); the same findings were reproduced on production before this change. The new panel controls and Properties panel have no findings in the targeted accessibility audit. No library focus behavior was changed.

Deployed to `https://thebestfreepdf.com` as `dpl_2uLLd1UDLT3uPHFQmDayFrbrEJ8g`; the production build passed. Repeated the 390-pixel WebKit interaction check against the deployed UI successfully using the sample proposal and mocked storage. No customer documents were used or changed.
