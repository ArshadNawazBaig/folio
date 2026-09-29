# Folio date picker

Use `DatePicker` from `src/components/date-picker.tsx` for editable calendar dates. Use `DateTimePicker` for optional local publication schedules. Both use Folio's typography, colors, buttons, and shared dropdowns.

```tsx
<DatePicker
  label="Due date"
  value={dueDate}
  onValueChange={setDueDate}
  clearable={false}
  disabled={saving}
/>
```

`value` is a `YYYY-MM-DD` string, or an empty string for an optional date. Optional `min` and `max` use that same format and must be ordered. `hint`, `placeholder`, and `name` are supported. The component owns its label; do not nest it inside another label. `name` adds a hidden form value. Keep business validation at the form boundary.

Month and year selectors, a Monday-first calendar, Today, optional Clear date, and validated direct entry are included. Arrow keys move days, Home/End move within the week, Page Up/Down move months, and Shift + Page Up/Down move years. Escape cancels and returns focus. Only one day enters the Tab sequence. This follows the interaction guidance in the [W3C date picker pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/); the implementation and styling are Folio's own.

Date-only values use UTC calendar arithmetic internally and remain date strings, avoiding timezone and daylight-saving shifts. `DateTimePicker` returns local `YYYY-MM-DDTHH:mm` values and uses custom hour/minute dropdowns. Convert to an ISO timestamp only at the scheduling boundary. `validLocalDateTime` rejects invalid or skipped local times; an ambiguous fall-back hour follows JavaScript's earlier-offset behavior.

Popups stay inside the nearest native dialog's top layer when needed. The shared `Dropdown` has an optional `portalContainer` for these nested controls. Do not move these popups to the document body when their trigger is in a native modal dialog.

Current integrations: invoice date, invoice due date, and blog publication date/time. Static timestamps remain ordinary text.

Run `npx tsx --test tests/calendar.test.ts` for date arithmetic and timezone validation, and `npm run test:calendar` for desktop Chromium, Android Chromium, and iPhone WebKit checks. The calendar browser suite shares `.next-auth-tests` with account/invoice suites; run them sequentially.
