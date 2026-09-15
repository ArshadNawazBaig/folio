import test from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../src/lib/tools';
import { remoteTools, outputFormats } from '../src/lib/remote-types';
import {
  availablePremiumToolNames,
  premiumDownloads,
  toolDownloadAccess,
} from '../src/lib/tool-access';

test('only advanced downloads are paid; ordinary editor and native tools remain free', () => {
  assert.deepEqual(
    tools
      .filter((tool) => tool.premium)
      .map((tool) => tool.slug)
      .sort(),
    [
      'edit-pdf-text',
      'pdf-to-excel',
      'pdf-to-powerpoint',
      'pdf-to-word',
      'protect-pdf',
      'translate-pdf',
    ],
  );
  assert.equal(toolDownloadAccess('edit-pdf'), 'mixed');
  for (const slug of [
    'sign-pdf',
    'create-pdf-form',
    'compress-pdf',
    'pdf-to-text',
    'enhance-image',
    'create-qr-code',
  ])
    assert.equal(toolDownloadAccess(slug), 'free');
  // A prototype key or a new, unclassified tool cannot silently become a free download.
  for (const slug of ['constructor', '__proto__', 'new-converter'])
    assert.throws(() => toolDownloadAccess(slug), /Missing download policy/);
});

test('pricing only promises enabled premium tools, including newly connected converters', () => {
  assert.deepEqual(availablePremiumToolNames(tools), ['PDF text editor', 'Protect PDF']);
  const connected = tools.map((tool) => ({
    ...tool,
    available: tool.available || tool.slug === 'pdf-to-word',
  }));
  assert.deepEqual(availablePremiumToolNames(connected), [
    'PDF text editor',
    'Protect PDF',
    'PDF to Word',
  ]);
  assert.ok(!availablePremiumToolNames(connected).includes('Translate PDF'));
});

test('all paid remote exports explain the matching file format at the download gate', () => {
  for (const slug of remoteTools) {
    assert.equal(toolDownloadAccess(slug), 'premium');
    assert.ok(premiumDownloads[slug].reason.includes('requires a premium plan'));
    assert.ok(premiumDownloads[slug].format.startsWith(outputFormats[slug].label));
  }
});
