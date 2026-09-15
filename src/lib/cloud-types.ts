export const CLOUD_BUCKET = 'folio-documents';
export const CLOUD_FILE_LIMIT = 50 * 1024 * 1024;
export const FREE_STORAGE_LIMIT = 100 * 1024 * 1024;
export const PRO_STORAGE_LIMIT = 1024 * 1024 * 1024;
export const CLOUD_FILE_COUNT = 200;
export type StorageUsage = {
  // null means unlimited; never serialize Infinity as a quota.
  limit: number | null;
  used: number;
  available: number | null;
  full: boolean;
  recovery: { slot: string; size: number }[];
};
export function storageLabel(bytes: number | null) {
  if (bytes === null) return 'Unlimited';
  return bytes >= PRO_STORAGE_LIMIT
    ? `${bytes / PRO_STORAGE_LIMIT} GB`
    : `${bytes / 1024 / 1024} MB`;
}
export type CloudDocument = {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'ready' | 'deleting';
  workspace_revision?: number;
  workspace_size?: number;
  created_at: string;
  updated_at: string;
  guest?: boolean;
  expires_at?: string | null;
};
export function pdfName(value: string) {
  // oxlint-disable-next-line no-control-regex -- Strip control characters from file names.
  const name = value.trim().replace(/[\u0000-\u001f\u007f/\\]/g, '-');
  return `${name.replace(/\.pdf$/i, '').slice(0, 156) || 'Untitled document'}.pdf`;
}
