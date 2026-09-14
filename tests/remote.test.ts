import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
test('real document handlers validate providers, preview files, encrypt results, and block unpaid exports', async () => {
  await promisify(execFile)(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      fileURLToPath(new URL('./fixtures/remote-server.mts', import.meta.url)),
    ],
    { timeout: 60000 },
  );
});
