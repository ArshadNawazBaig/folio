export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_BATCH_SIZE = 150 * 1024 * 1024;
export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '');
}
export function download(bytes: Uint8Array | Blob, name: string, type = 'application/pdf') {
  const blob = bytes instanceof Blob ? bytes : new Blob([new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function parsePages(input: string, total: number): number[] {
  if (!input.trim()) return Array.from({ length: total }, (_, i) => i);
  const out: number[] = [];
  for (const part of input.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Use page numbers such as 1-3, 5, 8-10.');
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (start < 1 || end > total || start > end)
      throw new Error(`Choose pages between 1 and ${total}, with ranges in ascending order.`);
    for (let n = start; n <= end; n++) if (!out.includes(n - 1)) out.push(n - 1);
  }
  return out;
}
export function friendlyError(error: unknown) {
  const text = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  if (
    (error instanceof Error && error.name === 'PasswordException') ||
    /encrypted|password[ -]protected|PDF.*password|password.*PDF/i.test(text)
  )
    return 'This PDF is password protected. Open it with its password in a trusted PDF reader and save an unlocked copy first.';
  if (/parse|invalid pdf|header|xref/i.test(text))
    return 'This file could not be read as a PDF. It may be damaged or use an unsupported format.';
  if (/WinAnsi|cannot encode/i.test(text))
    return 'This text contains characters the current export font cannot render. Please use a supported Latin character or keep the original document text.';
  if (/quota/i.test(text))
    return 'Browser storage is unavailable. Keep this editor open and download a copy of your document.';
  return text;
}
