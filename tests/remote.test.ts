import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
for (const free of [true, false])
  test(`removed document tools reject processing and preserve legacy encrypted exports with free launch ${free}`, async () => {
    await promisify(execFile)(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        fileURLToPath(new URL('./fixtures/remote-server.mts', import.meta.url)),
      ],
      { timeout: 60000, env: { ...process.env, NEXT_PUBLIC_FREE_LAUNCH: String(free) } },
    );
  });
