import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const env = process.env;
const present = (...names) => names.every((name) => !!env[name]?.trim());
const report = (label, ok) => console.log(`${ok ? 'CONFIGURED' : 'MISSING / INVALID'}: ${label}`);
let missing = false;
function check(label, ok) {
  report(label, ok);
  if (!ok) missing = true;
}
check(
  'Supabase public URL and publishable key',
  present('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
);
check('Supabase server service key', present('SUPABASE_SERVICE_ROLE_KEY'));
check(
  'Lemon Squeezy API key, store, webhook and variant IDs',
  present(
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
    'LEMON_SQUEEZY_MONTHLY_VARIANT_ID',
    'LEMON_SQUEEZY_TRIAL_VARIANT_ID',
  ),
);
check(
  'Lemon Squeezy explicit test/live mode',
  ['true', 'false'].includes(env.LEMON_SQUEEZY_TEST_MODE || ''),
);
check('Document result encryption key', /^[a-f0-9]{64}$/i.test(env.DOCUMENT_RESULT_KEY || ''));
check(
  'Google Cloud document translation',
  present(
    'GOOGLE_TRANSLATION_PROJECT_ID',
    'GOOGLE_TRANSLATION_CLIENT_EMAIL',
    'GOOGLE_TRANSLATION_PRIVATE_KEY',
  ),
);
check(
  'Office conversions (CloudConvert or ConvertAPI)',
  present('CLOUDCONVERT_API_KEY') || present('CONVERTAPI_TOKEN'),
);
let publicDomain = false;
try {
  const url = new URL(env.NEXT_PUBLIC_SITE_URL || '');
  publicDomain = url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname);
} catch {}
report(
  'Production HTTPS origin and indexing',
  publicDomain && env.NEXT_PUBLIC_INDEXABLE === 'true',
);
console.log(
  'Google OAuth provider settings, database migrations, admin assignment, key validity, and real payments must be verified in the connected services. See docs/SETUP.md.',
);
if (missing) process.exitCode = 1;
