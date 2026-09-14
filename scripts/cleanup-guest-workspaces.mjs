import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd());
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) throw new Error('Configure Supabase before running guest-workspace cleanup.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// Signed upload URLs can remain valid for up to two hours. Purge after that grace period.
const now = new Date(Date.now() - 2 * 3600000).toISOString();
const { data: expired, error } = await db
  .from('cloud_documents')
  .select('id,object_path')
  .is('user_id', null)
  .lt('expires_at', now)
  .order('expires_at')
  .limit(100);
if (error) throw new Error('Expired workspaces could not be listed. Check migration 006.');
let removed = 0;
for (const file of expired) {
  // A concurrent sign-in claim wins safely unless this record has already entered deletion.
  const marked = await db
    .from('cloud_documents')
    .update({ status: 'deleting' })
    .eq('id', file.id)
    .is('user_id', null)
    .lt('expires_at', now)
    .select('id')
    .maybeSingle();
  if (marked.error) throw new Error('A workspace could not be marked for cleanup.');
  if (!marked.data) continue;
  const deletion = await db.storage.from('folio-documents').remove([file.object_path]);
  if (deletion.error) continue; // Keep the row for a later retry if Storage is unavailable.
  const row = await db
    .from('cloud_documents')
    .delete()
    .eq('id', file.id)
    .is('user_id', null)
    .eq('status', 'deleting');
  if (!row.error) removed++;
}
console.log(`Removed ${removed} expired guest workspaces; checked ${expired.length}.`);
