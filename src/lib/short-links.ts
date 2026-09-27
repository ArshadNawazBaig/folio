import { z } from 'zod';

export const FREE_LINK_LIMIT = 10;
export const PRO_LINK_LIMIT = 1000;
export const aliasPattern = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
export type ShortLink = {
  id: string;
  alias: string;
  destination: string;
  title: string;
  custom: boolean;
  created_at: string;
  updated_at: string;
  shortUrl: string;
};
export type LinkListing = {
  links: ShortLink[];
  total: number;
  used: number;
  limit: number;
};

export function normalizeDestination(value: string, origin: string) {
  const input = value.trim();
  if (
    !input ||
    input.length > 2048 ||
    [...input].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    throw new Error('Enter a website address of up to 2,048 characters, without spaces.');
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS website address.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !url.hostname.includes('.') ||
    url.username ||
    url.password ||
    url.href.length > 2048
  )
    throw new Error('Use an HTTP or HTTPS website address without a username or password.');
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* Invalid escapes cannot name a Folio route. */
  }
  if (url.origin === new URL(origin).origin && /^\/s(?:\/|$)/i.test(path))
    throw new Error('Use the original destination instead of another Folio short link.');
  return url.href;
}

export const createLinkSchema = z
  .object({
    destination: z.string().max(2048),
    title: z.string().trim().max(100).default(''),
    alias: z
      .string()
      .trim()
      .toLowerCase()
      .refine(
        (value) => !value || aliasPattern.test(value),
        'Use 3–48 letters, numbers, or hyphens, starting and ending with a letter or number.',
      )
      .default(''),
  })
  .strict();
export const updateLinkSchema = z
  .object({
    destination: z.string().max(2048),
    title: z.string().trim().max(100),
  })
  .strict();
