import type { EditorState } from './types';
import { replacementFonts, type TextBlock, type TextChange } from './pro-types';

export const defaultTextChange = (block: TextBlock): TextChange => ({
  id: block.id,
  original: block.text,
  text: block.text,
  font: 'original',
  size: block.size,
  color: block.color,
  ...(block.paint ? { preservePaint: true } : {}),
});
export function resolvedTextChange(block: TextBlock, change?: TextChange): TextChange {
  if (!change) return defaultTextChange(block);
  if (block.paint && change.preservePaint === undefined && change.color === '#000000')
    return { ...change, color: block.color, preservePaint: true };
  return change;
}
export function textFontOptions(block: TextBlock) {
  return [
    { value: 'original', label: `Original · ${block.font.replace(/^[A-Z]{6}\+/, '')}` },
    ...replacementFonts.map((font) => ({ value: font, label: font.replace('-', ' ') })),
  ];
}
export function unchangedText(block: TextBlock, change: TextChange) {
  return (
    !change.copy &&
    change.text === block.text &&
    change.font === 'original' &&
    change.size === block.size &&
    change.color === block.color &&
    (!block.paint || change.preservePaint !== false) &&
    !change.offset?.x &&
    !change.offset?.y
  );
}
export function hasTextChanges(state: EditorState) {
  return state.pages.some((page) => Object.keys(state.textChanges?.[page.id] || {}).length > 0);
}
// Each displayed page owns its edits, including duplicates of the same original page.
export function arrangedTextChanges(state: EditorState, sourcePages = state.pages): TextChange[] {
  return state.pages.flatMap((page, index) =>
    Object.values(state.textChanges?.[page.id] || {}).map((change) => ({
      ...change,
      id: `${index}:${change.id.split(':').slice(1).join(':')}`,
      ...(change.copy
        ? {
            copy: {
              ...change.copy,
              page: sourcePages.findIndex((source) => source.sourceIndex === change.copy!.page),
            },
          }
        : {}),
    })),
  );
}
export function withoutTextChanges(state: EditorState): EditorState {
  const { textChanges: _changes, ...rest } = state;
  return rest;
}
