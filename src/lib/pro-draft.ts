import { clearCloudRecovery, readCloudRecovery, saveCloudRecovery } from './cloud-recovery';
import type { TextChange, TextInspection } from './pro-types';
import type { EditorState } from './types';
export type ProDraft = {
  name: string;
  bytes: Uint8Array;
  changes: Record<string, TextChange>;
  inspection: TextInspection;
  page: number;
  savedAt: number;
  editorState?: EditorState;
  flatten?: boolean;
};
export async function saveProDraft(draft: ProDraft) {
  let binary = '';
  for (let offset = 0; offset < draft.bytes.length; offset += 8192)
    binary += String.fromCharCode(...draft.bytes.subarray(offset, offset + 8192));
  return saveCloudRecovery(
    'pro-text',
    { ...draft, bytes: btoa(binary) },
    draft.savedAt + 7 * 86400000,
  );
}
export async function readProDraft(): Promise<ProDraft | undefined> {
  const draft = await readCloudRecovery<Omit<ProDraft, 'bytes'> & { bytes: string }>('pro-text');
  if (
    !draft ||
    typeof draft.bytes !== 'string' ||
    typeof draft.name !== 'string' ||
    !draft.inspection ||
    !draft.changes ||
    (draft.editorState &&
      (!Array.isArray(draft.editorState.pages) ||
        !draft.editorState.pages.length ||
        !Array.isArray(draft.editorState.annotations) ||
        !draft.editorState.formValues))
  )
    return undefined;
  return { ...draft, bytes: Uint8Array.from(atob(draft.bytes), (char) => char.charCodeAt(0)) };
}
export async function clearProDraft() {
  await clearCloudRecovery('pro-text');
}
