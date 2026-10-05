import test from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../src/lib/tools';
import { remoteTools } from '../src/lib/remote-types';
import { availablePremiumToolNames, toolDownloadAccess } from '../src/lib/tool-access';

test('every catalogue download is free during launch', () => {
  assert.deepEqual(
    tools.filter((tool) => tool.premium),
    [],
  );
  for (const tool of tools) assert.equal(toolDownloadAccess(tool.slug), 'free');
  // A prototype key or a new, unclassified tool cannot silently become a free download.
  for (const slug of ['constructor', '__proto__', 'new-converter'])
    assert.throws(() => toolDownloadAccess(slug), /Missing download policy/);
});

test('no pricing offers are advertised for the active catalog', () => {
  assert.deepEqual(availablePremiumToolNames(tools), []);
  assert.deepEqual(
    availablePremiumToolNames(tools.map((tool) => ({ ...tool, available: true }))),
    [],
  );
});

test('removed tools have no download policy or catalog entry', () => {
  for (const slug of remoteTools) {
    assert.ok(!tools.some((tool) => tool.slug === slug));
    assert.throws(() => toolDownloadAccess(slug), /Missing download policy/);
  }
});
