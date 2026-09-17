export const replacementFonts = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Courier',
  'Courier-Bold',
] as const;
export type ReplacementFont = (typeof replacementFonts)[number];
export const textFonts = ['original', ...replacementFonts] as const;
export type DocumentFont = ReplacementFont | `google:${string}:${number}:${'normal' | 'italic'}`;
export type TextFont = 'original' | DocumentFont;
export type TextBlock = {
  id: string;
  page: number;
  objectIndex: number;
  objectPath?: number[];
  text: string;
  font: string;
  fontWeight?: number;
  fontItalic?: boolean;
  fontCharacters?: string;
  fontCategory?: 'sans' | 'serif' | 'mono';
  replacementFont: ReplacementFont;
  size: number;
  color: string;
  paint?: { coords: number[]; colors: string[] };
  bounds: [number, number, number, number];
  matrix?: number[];
};
export type TextInspection = {
  version?: number;
  pageCount: number;
  blocks: TextBlock[];
  skipped: number;
  // Missing on older snapshots and full-document inspections.
  pages?: number[];
};
export type TextPreview = {
  partial?: boolean;
  preview: string;
  width: number;
  height: number;
  page: number;
  tiles?: { preview: string; top: number; height: number }[];
};
// Browser-only preview pixels are transferred from the worker, never persisted
// in workspaces or returned by the public preview API.
export type PixelTextPreview = {
  partial?: boolean;
  width: number;
  height: number;
  page: number;
  pixels: { data: Uint8Array; top: number; height: number }[];
};
export type InteractiveTextImage = TextPreview | PixelTextPreview;
export type TextChange = {
  id: string;
  copy?: TextBlock;
  original: string;
  text: string;
  font: TextFont;
  size: number;
  color: string;
  preservePaint?: boolean;
  offset?: { x: number; y: number };
};
export type ProPlan = {
  id: 'trial' | 'month';
  amount: number;
  currency: string;
  label: string;
};
export type AccountAccess = {
  pro: boolean;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  billingReady: boolean;
  trial: boolean;
  admin?: boolean;
  courtesy?: boolean;
  renewalLabel?: string;
};
