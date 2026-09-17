'use client';
import { accountFetch, AccountRequestError } from './auth-client';
import { runPdf } from './pdf-client';
import { arrangedTextChanges, hasTextChanges, withoutTextChanges } from './editor-text';
import type { EditorState } from './types';

export async function requestTextPdf(
  bytes: Uint8Array,
  name: string,
  job: object,
  paid = false,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', new Blob([bytes.slice().buffer], { type: 'application/pdf' }), name);
  form.append('job', JSON.stringify(job));
  const response = paid
    ? await accountFetch('/api/pro/pdf', { method: 'POST', body: form, signal })
    : await fetch('/api/pro/preview', { method: 'POST', body: form, signal });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new AccountRequestError(
      response.status,
      result.error || 'This PDF could not be processed.',
    );
  }
  return response;
}

export async function exportWorkspacePdf(
  bytes: Uint8Array,
  name: string,
  state: EditorState,
  flatten: boolean,
) {
  if (!hasTextChanges(state))
    return runPdf('edit', [{ bytes, name }], { state: withoutTextChanges(state), flatten });
  // Arrange the source pages before replacing text, then add annotations and field values.
  // Only the authenticated export endpoint returns PDF bytes with original-text changes.
  const sourcePages = [...state.pages];
  for (const page of state.pages) {
    for (const change of Object.values(state.textChanges?.[page.id] || {})) {
      if (change.copy && !sourcePages.some((item) => item.sourceIndex === change.copy!.page))
        sourcePages.push({
          ...page,
          id: `copy-source-${change.copy.page}`,
          sourceIndex: change.copy.page,
          rotation: 0,
        });
    }
  }
  const arranged = await runPdf('edit', [{ bytes, name }], {
    state: { pages: sourcePages, annotations: [], formValues: {} },
  });
  const response = await requestTextPdf(
    arranged.bytes,
    name,
    { operation: 'edit', changes: arrangedTextChanges(state, sourcePages) },
    true,
  );
  const edited = new Uint8Array(await response.arrayBuffer());
  return runPdf('edit', [{ bytes: edited, name }], {
    state: {
      ...withoutTextChanges(state),
      pages: state.pages.map((page, sourceIndex) => ({ ...page, sourceIndex })),
    },
    flatten,
  });
}
