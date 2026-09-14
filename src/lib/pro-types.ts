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
export type TextFont = (typeof textFonts)[number];
export type TextBlock = {
  id: string;
  page: number;
  objectIndex: number;
  text: string;
  font: string;
  fontWeight?: number;
  fontItalic?: boolean;
  fontCharacters?: string;
  fontCategory?: 'sans' | 'serif' | 'mono';
  replacementFont: ReplacementFont;
  size: number;
  color: string;
  bounds: [number, number, number, number];
  matrix?: number[];
};
export type TextInspection = { pageCount: number; blocks: TextBlock[]; skipped: number };
export type TextPreview = { preview: string; width: number; height: number; page: number };
export type TextChange = {
  id: string;
  original: string;
  text: string;
  font: TextFont;
  size: number;
  color: string;
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
