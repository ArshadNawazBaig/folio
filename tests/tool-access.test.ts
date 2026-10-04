import test from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../src/lib/tools';
import { remoteTools, outputFormats } from '../src/lib/remote-types';
import {
  availablePremiumToolNames,
  premiumDownloads,
  toolDownloadAccess,
} from '../src/lib/tool-access';

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

test('no pricing offers are advertised even when a remote provider is connected', () => {
  assert.deepEqual(availablePremiumToolNames(tools), []);
  assert.deepEqual(
    availablePremiumToolNames(tools.map((tool) => ({ ...tool, available: true }))),
    [],
  );
});

test('remote downloads are free while dormant billing retains the matching file formats', () => {
  for (const slug of remoteTools) {
    assert.equal(toolDownloadAccess(slug), 'free');
    assert.ok(premiumDownloads[slug].reason.includes('requires a premium plan'));
    assert.ok(premiumDownloads[slug].format.startsWith(outputFormats[slug].label));
  }
});
