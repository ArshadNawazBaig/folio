import type { EditorState } from './types';
import type { TextBlock, TextChange } from './pro-types';

export const defaultTextChange = (block: TextBlock): TextChange => ({
  id: block.id,
  original: block.text,
  text: block.text,
  font: block.replacementFont,
  size: block.size,
  color: block.color,
});
export function hasTextChanges(state: EditorState) {
  return state.pages.some((page) => Object.keys(state.textChanges?.[page.id] || {}).length > 0);
}
// Each displayed page owns its edits, including duplicates of the same original page.
export function arrangedTextChanges(state: EditorState): TextChange[] {
  return state.pages.flatMap((page, index) =>
    Object.values(state.textChanges?.[page.id] || {}).map((change) => ({
      ...change,
      id: `${index}:${change.id.split(':')[1]}`,
    })),
  );
}
export function withoutTextChanges(state: EditorState): EditorState {
  const { textChanges: _changes, ...rest } = state;
  return rest;
}
