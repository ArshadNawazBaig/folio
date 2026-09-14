import { spawn } from 'node:child_process';
// This browser fixture cannot contact real accounts, payment providers, or document services.
const env = {
  ...process.env,
  FOLIO_TEST_OUTPUT: 'auth',
  NEXT_PUBLIC_SUPABASE_URL: 'https://folio-auth-tests.example.test',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-public',
  NEXT_PUBLIC_INDEXABLE: 'false',
  SUPABASE_SERVICE_ROLE_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  GOOGLE_TRANSLATION_PROJECT_ID: '',
  GOOGLE_TRANSLATION_CLIENT_EMAIL: '',
  GOOGLE_TRANSLATION_PRIVATE_KEY: '',
  CONVERTAPI_TOKEN: '',
  DOCUMENT_RESULT_KEY: '',
};
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3001'],
  { stdio: 'inherit', env },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
