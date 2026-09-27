import 'server-only';
import { randomBytes } from 'node:crypto';
import { adminDb } from './auth';
import { ApiError, boundedBody } from './http';
import { siteUrl } from '../seo';
import {
  createLinkSchema,
  normalizeDestination,
  updateLinkSchema,
  type ShortLink,
} from '../short-links';

export const linkFields = 'id,alias,destination,title,custom,created_at,updated_at';
export const privateLinkHeaders = { 'Cache-Control': 'private, no-store' };
export function withShortUrl(link: Omit<ShortLink, 'shortUrl'>): ShortLink {
  return { ...link, shortUrl: `${siteUrl}/s/${link.alias}` };
}
export function linkError(error: { message: string } | null) {
  if (!error) return;
  const errors: Record<string, [number, string]> = {
    link_pro_required: [402, 'Custom aliases and destination changes require Folio Pro.'],
    link_alias_taken: [409, 'This alias is already reserved. Choose a different one.'],
    link_limit: [
      409,
      'Your saved-link limit is reached. Delete an older link to make room. Free accounts can also upgrade to Pro.',
    ],
    link_rate_limit: [429, 'You have reached the link creation limit. Please try again later.'],
    link_missing: [404, 'This link was not found in your account.'],
    suspended: [403, 'This account is suspended. Contact support.'],
    deletion_in_progress: [403, 'This account is being deleted.'],
  };
  const matched = Object.entries(errors).find(([key]) => error.message.includes(key));
  if (matched) throw new ApiError(...matched[1]);
  throw new ApiError(503, 'Your links are unavailable. Please try again or contact support.');
}
export async function linkBody(request: Request, update = false) {
  const body = JSON.parse((await boundedBody(request, 16384)).toString());
  const parsed = (update ? updateLinkSchema : createLinkSchema).safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
  try {
    return { ...parsed.data, destination: normalizeDestination(parsed.data.destination, siteUrl) };
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
}
export async function createShortLink(userId: string, body: Awaited<ReturnType<typeof linkBody>>) {
  const customAlias = 'alias' in body ? body.alias : '';
  for (let attempt = 0; attempt < 4; attempt++) {
    const alias = customAlias || randomBytes(6).toString('hex');
    const { data, error } = await adminDb().rpc('create_short_link', {
      actor: userId,
      link_alias: alias,
      link_destination: body.destination,
      link_title: body.title,
      is_custom: !!customAlias,
    });
    if (!customAlias && error?.message.includes('link_alias_taken')) continue;
    linkError(error);
    return withShortUrl(data);
  }
  throw new ApiError(503, 'A short link could not be reserved. Please try again.');
}
