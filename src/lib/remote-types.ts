import type { TextPreview } from './pro-types';
// Retained only to read and export legacy saved results; these tools are no longer offered.
export const remoteTools = [
  'translate-pdf',
  'pdf-to-word',
  'pdf-to-excel',
  'pdf-to-powerpoint',
] as const;
export type RemoteTool = (typeof remoteTools)[number];
export const outputFormats = {
  'translate-pdf': { extension: 'pdf', mime: 'application/pdf', label: 'PDF' },
  'pdf-to-word': {
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word',
  },
  'pdf-to-excel': {
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel',
  },
  'pdf-to-powerpoint': {
    extension: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'PowerPoint',
  },
} as const;
export type RemoteResult = {
  artifact: string;
  filename: string;
  size: number;
  pages: number;
  expiresAt: number;
  tool: RemoteTool;
  source?: string;
  target?: string;
  preview?: TextPreview;
};
export const REMOTE_MAX_OUTPUT = 20 * 1024 * 1024;
export const REMOTE_MAX_ARTIFACT_BODY = 30 * 1024 * 1024;
