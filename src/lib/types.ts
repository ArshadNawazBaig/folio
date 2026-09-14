import type { TextChange } from './pro-types';
export type AnnotationKind =
  | 'text'
  | 'highlight'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'cross'
  | 'check'
  | 'whiteout'
  | 'comment'
  | 'link'
  | 'draw'
  | 'signature'
  | 'image'
  | 'field'
  | 'checkbox';
export type EditorMode = AnnotationKind | 'select' | 'form-fill' | 'erase' | 'original-text';
export type Annotation = {
  id: string;
  pageId: string;
  kind: AnnotationKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  size: number;
  opacity: number;
  points?: { x: number; y: number }[];
  dataUrl?: string;
  required?: boolean;
  url?: string;
};
export type PageModel = {
  id: string;
  sourceIndex: number | null;
  rotation: number;
  width: number;
  height: number;
};
export type FormValue = string | boolean;
export type EditorState = {
  pages: PageModel[];
  annotations: Annotation[];
  formValues: Record<string, FormValue>;
  textChanges?: Record<string, Record<string, TextChange>>;
};
export type LocalDocument = {
  id: string;
  name: string;
  bytes: Uint8Array;
  state: EditorState;
  updatedAt: number;
  size: number;
};
export type PdfOperation =
  | 'merge'
  | 'extract'
  | 'split'
  | 'rotate'
  | 'compress'
  | 'watermark'
  | 'numbers'
  | 'crop'
  | 'images'
  | 'edit';
export type PdfOptions = {
  pages?: number[];
  rotation?: number;
  text?: string;
  size?: number;
  opacity?: number;
  color?: string;
  start?: number;
  margin?: number;
  a4?: boolean;
  state?: EditorState;
  flatten?: boolean;
};
export type PdfInput = { bytes: Uint8Array; name: string; type?: string };
export type PdfOutput = { bytes: Uint8Array; name: string; type: string; note?: string };

export type DocumentSummary = {
  id: string;
  name: string;
  updatedAt: number;
  size: number;
  pageCount: number;
};
