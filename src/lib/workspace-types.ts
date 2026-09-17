import { textBlockSchema } from './text-block-schema';
import { z } from 'zod';
import { type TextFont, type DocumentFont } from './pro-types';
import { isDocumentFont } from './document-font-registry.mjs';
import { isPdfTextSize } from './pdf-text-size.mjs';
import type { EditorMode, EditorState } from './types';
import type { TextInspection } from './pro-types';
export const WORKSPACE_LIMIT = 8 * 1024 * 1024;
const number = z.number().finite();
const id = z.string().min(1).max(128);
const color = z.string().regex(/^#[\da-f]{6}$/i);
const textChange = z.object({
  id,
  copy: textBlockSchema.optional(),
  original: z.string().max(10000),
  text: z.string().max(2000),
  font: z.custom<TextFont>((value) => value === 'original' || isDocumentFont(value)),
  size: number.refine(isPdfTextSize, 'Choose a valid positive text size.'),
  color,
  preservePaint: z.boolean().optional(),
  offset: z
    .object({ x: number.min(-100000).max(100000), y: number.min(-100000).max(100000) })
    .optional(),
});
export const workspaceSchema = z
  .object({
    state: z.object({
      pages: z
        .array(
          z.object({
            id,
            sourceIndex: z.number().int().min(0).max(499).nullable(),
            rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
            width: number.positive().max(100000),
            height: number.positive().max(100000),
          }),
        )
        .min(1)
        .max(500),
      annotations: z
        .array(
          z.object({
            id,
            pageId: id,
            kind: z.enum([
              'text',
              'highlight',
              'rectangle',
              'ellipse',
              'line',
              'cross',
              'check',
              'whiteout',
              'comment',
              'link',
              'draw',
              'signature',
              'image',
              'field',
              'checkbox',
            ]),
            x: number,
            y: number,
            width: number.nonnegative(),
            height: number.nonnegative(),
            text: z.string().max(50000),
            color,
            size: number.nonnegative(),
            font: z.custom<DocumentFont>(isDocumentFont).optional(),
            opacity: number.min(0).max(1),
            points: z
              .array(z.object({ x: number, y: number }))
              .max(100000)
              .optional(),
            dataUrl: z.string().startsWith('data:image/').max(WORKSPACE_LIMIT).optional(),
            signatureSource: z.enum(['draw', 'image', 'type']).optional(),
            required: z.boolean().optional(),
            url: z.string().max(2048).optional(),
          }),
        )
        .max(10000),
      formValues: z.record(z.string().max(256), z.union([z.string().max(50000), z.boolean()])),
      textChanges: z.record(id, z.record(id, textChange)).optional(),
    }),
    inspection: z
      .object({
        version: z.number().int().min(1).max(4).optional(),
        pageCount: z.number().int().min(1).max(100),
        pages: z.array(z.number().int().min(0).max(99)).max(100).optional(),
        skipped: number.nonnegative(),
        blocks: z.array(textBlockSchema).max(5000),
      })
      .nullable(),
    page: z.number().int().min(0).max(499),
    mode: z
      .enum([
        'select',
        'text',
        'highlight',
        'rectangle',
        'ellipse',
        'line',
        'cross',
        'check',
        'whiteout',
        'comment',
        'link',
        'draw',
        'signature',
        'image',
        'field',
        'checkbox',
        'form-fill',
        'erase',
        'original-text',
      ])
      .optional(),
    flatten: z.boolean(),
  })
  .strict()
  .refine((value) => value.page < value.state.pages.length, 'Choose a page in this document.');
export type WorkspaceSnapshot = {
  state: EditorState;
  inspection: TextInspection | null;
  page: number;
  mode?: EditorMode;
  flatten: boolean;
};
export type WorkspaceRecord = {
  id: string;
  name: string;
  revision: number;
  snapshot: WorkspaceSnapshot | null;
  expiresAt: string | null;
  updatedAt: string;
  status: string;
};
