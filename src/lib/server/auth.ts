import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from './http';
export function authReady() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
export function adminDb() {
  if (!authReady()) throw new ApiError(503, 'Accounts are not connected yet.');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function requireUser(request: Request, options: { allowSuspended?: boolean } = {}) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new ApiError(401, 'Sign in to access Folio Pro.');
  const { data, error } = await adminDb().auth.getUser(token);
  if (error || !data.user)
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  if (!options.allowSuspended) {
    const { data: control, error: controlError } = await adminDb()
      .from('account_controls')
      .select('suspended')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (controlError)
      throw new ApiError(503, 'Your account could not be verified. Please try again.');
    if (control?.suspended)
      throw new ApiError(403, 'This account is suspended. Contact support for help.');
  }
  return data.user;
}
