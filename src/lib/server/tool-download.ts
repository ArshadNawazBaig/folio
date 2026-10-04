import 'server-only';
import { FREE_LAUNCH } from '../access-policy';
import { requireUser } from './auth';
import { consumeProRequest } from './billing';
import { publicLimit } from './public-limit';

/** Private account APIs continue to requireUser. Only finished tool exports are public. */
export async function authorizeToolDownload(request: Request) {
  if (!FREE_LAUNCH) {
    const user = await requireUser(request);
    await consumeProRequest(user.id);
    return;
  }
  // Signed-in callers still undergo identity and suspension checks.
  if (request.headers.has('authorization')) await requireUser(request);
  publicLimit('download', 20);
}
