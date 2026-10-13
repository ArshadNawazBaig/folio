import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesToolSearch, summarizeTool } from '../src/lib/tool-summary';
import { toolDirectory } from '../src/lib/tool-directory';
import { tools } from '../src/lib/tools';

test('tool discovery accepts reordered words, extra spaces and punctuation', () => {
  for (const q of ['pdf merge', '  MERGE   PDF  ', 'merge-pdf']) {
    const results = toolDirectory(tools, { q }).tools;
    assert.ok(
      results.some((tool) => tool.slug === 'merge-pdf'),
      q,
    );
    assert.ok(!results.some((tool) => tool.slug === 'split-pdf'), q);
  }
  for (const [q, slug] of [
    ['make my PDF smaller', 'compress-pdf'],
    ['fill a form', 'sign-pdf'],
  ]) {
    assert.ok(
      toolDirectory(tools, { q }).tools.some((tool) => tool.slug === slug),
      q,
    );
  }
  assert.equal(toolDirectory(tools, { q: 'merge unicorn' }).total, 0);
});

test('localized discovery accepts unaccented queries and retains non-Latin text', () => {
  const tool = summarizeTool(tools.find((tool) => tool.slug === 'edit-pdf')!);
  for (const [name, query] of [
    ['Éditer un PDF', 'pdf editer'],
    ['PDF bearbeiten', 'bearbeiten pdf'],
    ['PDFを編集', '編集'],
    ['PDF 편집', '편집'],
  ]) {
    assert.equal(matchesToolSearch({ ...tool, name }, query), true, query);
  }
  assert.equal(matchesToolSearch(tool, '   '), true);
});
