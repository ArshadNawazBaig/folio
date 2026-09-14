export const CLOUD_BUCKET = 'folio-documents';
export const CLOUD_FILE_LIMIT = 50 * 1024 * 1024;
export const CLOUD_STORAGE_LIMIT = 500 * 1024 * 1024;
export const CLOUD_FILE_COUNT = 200;
export type CloudDocument = {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'ready' | 'deleting';
  workspace_revision?: number;
  workspace_size?: number;
  created_at: string;
  updated_at: string;
};
export function pdfName(value: string) {
  // oxlint-disable-next-line no-control-regex -- Strip control characters from file names.
  const name = value.trim().replace(/[\u0000-\u001f\u007f/\\]/g, '-');
  return `${name.replace(/\.pdf$/i, '').slice(0, 156) || 'Untitled document'}.pdf`;
}
