import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
test('real server handlers enforce admin roles, support ownership, Pro downloads, and maintenance recovery', async () => {
  await promisify(execFile)(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      fileURLToPath(new URL('./fixtures/platform-server.mts', import.meta.url)),
    ],
    { timeout: 60000 },
  );
});
