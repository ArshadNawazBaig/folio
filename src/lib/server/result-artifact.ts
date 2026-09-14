import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from './http';
import { remoteTools, REMOTE_MAX_OUTPUT, type RemoteTool } from '../remote-types';
const headerSchema = z
  .object({
    v: z.literal(1),
    tool: z.enum(remoteTools),
    filename: z.string().min(1).max(180),
    pages: z.number().int().min(1).max(100),
    expiresAt: z.number().int(),
  })
  .strict();
function key() {
  const secret = process.env.DOCUMENT_RESULT_KEY;
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret))
    throw new ApiError(503, 'Document downloads are not connected yet.');
  return Buffer.from(secret, 'hex');
}
export function artifactReady() {
  return /^[0-9a-f]{64}$/i.test(process.env.DOCUMENT_RESULT_KEY || '');
}
export function sealResult(
  bytes: Uint8Array,
  details: { tool: RemoteTool; filename: string; pages: number },
) {
  if (!bytes.length || bytes.length > REMOTE_MAX_OUTPUT)
    throw new ApiError(422, 'The converted file is too large. Try a smaller document.');
  const header = headerSchema.parse({
    ...details,
    v: 1,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  const aad = Buffer.from(JSON.stringify(header));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    ...details,
    expiresAt: header.expiresAt,
    size: bytes.length,
    artifact: [aad, iv, encrypted, cipher.getAuthTag()]
      .map((b) => b.toString('base64url'))
      .join('.'),
  };
}
export function openResult(artifact: string) {
  const secret = key();
  try {
    const parts = artifact.split('.');
    if (parts.length !== 4 || parts.some((p) => !p || !/^[\w-]+$/.test(p))) throw new Error();
    const [aad, iv, ciphertext, tag] = parts.map((p) => Buffer.from(p, 'base64url'));
    if (
      aad.length > 1024 ||
      iv.length !== 12 ||
      tag.length !== 16 ||
      ciphertext.length > REMOTE_MAX_OUTPUT
    )
      throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', secret, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const bytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const header = headerSchema.parse(JSON.parse(aad.toString()));
    if (header.expiresAt <= Date.now())
      throw new ApiError(410, 'This prepared file has expired. Process your original PDF again.');
    return { bytes, ...header };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'This prepared file could not be verified. Process the PDF again.');
  }
}
