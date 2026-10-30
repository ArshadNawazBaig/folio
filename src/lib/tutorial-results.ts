import evidence from './tutorial-evidence.json' with { type: 'json' };

type EvidenceFile = {
  href: string;
  checks: string[];
  width?: number;
  height?: number;
  bytes?: number;
};
const files = evidence.files as Record<string, EvidenceFile>;
export type WorkedResult = { href: string; label: string; checks: string[] };
export function tutorialResult(name: string, label: string): WorkedResult {
  const file = files[name];
  if (!file) throw new Error(`Missing tutorial result: ${name}`);
  return { href: file.href, label, checks: file.checks };
}

const resultFiles: Record<string, [string, string][]> = {
  'edit-pdf': [['budget-note.pdf', 'Budget page with a review note']],
  'edit-pdf-text': [['wording-one-correction.pdf', 'One corrected venue; other pages unchanged']],
  'merge-pdf': [['mixed-page-sizes.pdf', 'Merged portrait and landscape PDF']],
  'split-pdf': [['selected-pages.pdf', 'Pages 6, 2, 3 in the requested order']],
  'compress-pdf': [['optimized-structure.pdf', 'Optimized structure, with selectable text']],
  'organize-pdf': [['organized-packet.pdf', 'Five-page packet with appendix moved']],
  'rotate-pdf': [['rotation-corrected.pdf', 'Three upright practice pages']],
  'crop-pdf': [['cropped-margins.pdf', 'Report with 20-point margins trimmed']],
  'watermark-pdf': [['watermarked-packet.pdf', 'DRAFT watermark after the cover']],
  'page-numbers': [['numbered-after-cover.pdf', 'Numbered content pages; cover unchanged']],
  'protect-pdf': [['password-practice.pdf', 'Practice PDF — password: Practice-only-42']],
  'pdf-to-jpg': [['landscape-144dpi.jpg', 'Landscape page as JPG at 144 DPI']],
  'pdf-to-png': [['landscape-300dpi.png', 'Landscape page as PNG at 300 DPI']],
  'pdf-to-text': [['summary-budget.txt', 'Summary and Budget text reference']],
  'image-to-pdf': [['three-image-packet.pdf', 'JPG, PNG, and WebP on three A4 pages']],
  'jpg-to-pdf': [['receipt-a4.pdf', 'Receipt on one A4 page']],
  'png-to-pdf': [['screenshot-fitted.pdf', 'Screenshot on a fitted PDF page']],
  'merge-images': [['three-image-packet.pdf', 'Three formats in one ordered PDF']],
  'enhance-image': [['receipt-brightness-10.jpg', 'Receipt with brightness +10']],
  'jpg-to-webp': [['receipt-converted.webp', 'Receipt converted to WebP']],
  'webp-to-jpg': [['transparent-source-on-white.jpg', 'WebP transparency converted to white JPG']],
  'compress-images': [['receipt-under-20kb.jpg', 'JPG returned below the 20 KB target']],
  'signature-generator': [['fictional-signature.png', 'Fictional Sam Example signature PNG']],
  'sign-pdf': [['workshop-signed-copy.pdf', 'Completed workshop copy with a visual signature']],
  'create-pdf-form': [
    ['workshop-form-master.pdf', 'Blank fillable workshop master'],
    ['workshop-form-filled.pdf', 'Completed interactive form'],
    ['workshop-form-flattened.pdf', 'Completed flattened form'],
  ],
  'invoice-generator': [
    ['invoice-draft.json', 'Fictional invoice draft to import'],
    ['invoice-with-deposit.pdf', 'Invoice calculation: 175 less 50 paid = 125 due'],
  ],
  'create-qr-code': [
    ['practice-pdf-qr.svg', 'Static practice-PDF QR as SVG'],
    ['practice-pdf-qr.png', 'The same QR as PNG'],
  ],
};

export function toolWorkedResults(slug: string): WorkedResult[] {
  return (resultFiles[slug] || []).map(([name, label]) => tutorialResult(name, label));
}
export function measuredImageResult(name: string) {
  const value = files[name];
  if (!value?.width || !value?.height || !value?.bytes)
    throw new Error(`Missing image measurements: ${name}`);
  return `${value.width} × ${value.height} pixels; ${value.bytes.toLocaleString('en-US')} bytes`;
}

const sample = (name: string, label: string) => ({ href: `/samples/${name}`, label });
const practice = (name: string, label: string) => ({ href: `/samples/tutorials/${name}`, label });
export const tutorialInputs = {
  packet: sample('page-selection-practice.pdf', 'Six-page practice packet'),
  portrait: sample('a4-portrait-practice.pdf', 'A4 portrait report'),
  landscape: sample('letter-landscape-practice.pdf', 'Letter landscape appendix'),
  receipt: sample('practice-receipt.jpg', 'Fictional receipt JPG'),
  screenshot: sample('practice-screenshot.png', 'Practice screenshot PNG'),
  webp: sample('practice-transparent.webp', 'Transparent WebP graphic'),
  wording: practice('wording-source.pdf', 'Three-page wording exercise'),
  diagnostic: practice('text-layer-diagnostic.pdf', 'Text, scan, and invisible-layer PDF'),
  blankForm: practice('workshop-blank.pdf', 'Workshop page without form fields'),
  master: practice('workshop-form-master.pdf', 'Blank interactive workshop master'),
};
