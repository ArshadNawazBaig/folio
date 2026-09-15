# Record pagination

All record lists use `src/components/pagination.tsx` and the shared default `PAGE_SIZE = 10` in `src/lib/pagination.mjs`. This includes account and guest files, admin directories and activity, pricing history, support inquiries and replies, blog posts and revisions, tools, templates, and the font library. The custom selector offers 10, 25, 50, or 100 records. Article/PDF content and editor controls are not record lists.

- Pass `page`, `pageSize`, `total`, `onChange`, and `onPageSizeChange` for interactive lists. Public blog pages pass `href` instead, retaining search/category parameters in server-rendered links.
- Changing the page size, filter, or sort resets to page one. The selected size remains in effect while filtering; support inquiries and replies have independent sizes. Public blog links and searches retain the size in the URL. Deletion or expiry clamps the current page to the last available page. For small local collections, `useRecordPagination` handles slicing and resets.
- Database-backed routes validate page inputs and use `readPage` from `src/lib/server/pagination.ts`. Routes validate the selected size against `PAGE_SIZES`; the helper reads at most that many rows and an exact total. PostgREST's out-of-range `PGRST103` response triggers a one-row count recovery so the client can clamp its page.
- Admin user/subscription RPCs retain their existing 25-row batches. `databasePage` reads only the batches needed for the selected size (at most four for the available options). No database migration is required.
- Guest libraries have at most 200 files; their API calculates quota from all owned, unexpired metadata before filtering and slicing the response. Account quota and document counts likewise cover the full library, regardless of search or page.
- The shared controls use the app's surface, border, text, and sage colors. Narrow containers show compact page text and previous/next buttons; wider layouts include numbered pages. Current and disabled states have accessible labels.

`npm test` covers page boundaries, the legacy RPC adapter, query validation, ownership, and database range recovery. The auth browser suite covers file/admin/support pagination, search resets, guest deletion, page-size changes, mobile layout, and accessibility. The public blog suite checks server-rendered links and filters.
