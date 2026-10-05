import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import JSZip from 'jszip';
import { analyzeCsv, parseCsv } from '../scripts/search-console-opportunities.mjs';

test('Search Console CSV preserves quoted queries and derives CTR without inventing missing position', () => {
  const source =
    '\uFEFFTop queries,Clicks,Impressions,CTR,Position\r\n"pdf, ""form""",2,"1,234",99%,8.5\r\nempty,0,0,0%,0\r\n';
  assert.equal(parseCsv(source)[1][0], 'pdf, "form"');
  const report = analyzeCsv(source)!;
  assert.equal(report.dimension, 'query');
  assert.equal(report.rows[0].ctr, 2 / 1234);
  assert.equal(report.rows[0].reviewGroup, 'existing-visibility');
  assert.equal(report.rows[1].averagePosition, null);
  assert.equal(report.rows[1].reviewGroup, 'limited-data');
  assert.throws(() => parseCsv('"unclosed'), /Unclosed/);
});

test('unsupported or ambiguous exports fail instead of producing misleading priorities', () => {
  assert.throws(
    () => analyzeCsv('Top queries,Last 28 days Clicks\nmerge pdf,4'),
    /without date comparison/,
  );
  assert.throws(
    () => analyzeCsv('Top queries,Clicks,Impressions,Position\npdf,21,20,3'),
    /clicks exceed/,
  );
  assert.throws(
    () => analyzeCsv('Top queries,Clicks,Impressions,Position\npdf,1,20,3\npdf,2,30,4'),
    /repeated/,
  );
  assert.throws(
    () => analyzeCsv('Top queries,Clicks,Impressions,Position\npdf,0,20,-'),
    /invalid position/,
  );
  assert.throws(
    () => analyzeCsv('Query,Page,Clicks,Impressions,Position\npdf,/edit-pdf,1,20,3'),
    /separate/,
  );
  assert.equal(analyzeCsv('Date,Clicks,Impressions\n2026-10-01,2,10'), null);
});

test('brand matches stay separate and small samples do not become claimed wins', () => {
  const report = analyzeCsv(
    'Top queries,Clicks,Impressions,Position\nFolio editor,2,100,2\ncompress photo,0,1,1\npdf to png,0,100,7\nfree pdf editor,5,100,12',
  )!;
  assert.equal(report.rows[0].query, 'pdf to png');
  assert.equal(report.rows[0].reviewGroup, 'visible-without-clicks');
  assert.equal(
    report.rows.find((row) => row.query === 'compress photo')?.reviewGroup,
    'limited-data',
  );
  assert.equal(report.rows.at(-1)?.reviewGroup, 'possible-brand');
});

test('ZIP CLI keeps page and query tables separate, records scope and never overwrites source data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'folio-gsc-test-'));
  try {
    const archive = join(directory, 'export.zip');
    const output = join(directory, 'report.json');
    const zip = new JSZip();
    zip.file('Queries.csv', 'Top queries,Clicks,Impressions,CTR,Position\npdf to png,2,40,5%,9');
    zip.file(
      'Pages.csv',
      'Top pages,Clicks,Impressions,CTR,Position\nhttps://thebestfreepdf.com/pdf-to-png,3,60,5%,12',
    );
    zip.file('Chart.csv', 'Date,Clicks,Impressions\n2026-10-01,3,60');
    await writeFile(archive, await zip.generateAsync({ type: 'nodebuffer' }));
    const run = promisify(execFile);
    await run(process.execPath, [
      'scripts/search-console-opportunities.mjs',
      archive,
      '--period',
      '2026-09-01:2026-09-28',
      '--context',
      'Web; all countries',
      '--output',
      output,
    ]);
    const report = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(report.period, '2026-09-01:2026-09-28');
    assert.equal(report.reports.length, 2);
    assert.deepEqual(
      report.reports.map((table: { dimension: string }) => table.dimension),
      ['query', 'page'],
    );
    assert.equal(report.reports[0].rows[0].page, undefined);
    assert.equal(report.reports[1].rows[0].query, undefined);
    assert.equal(report.ignoredFiles.length, 1);
    const before = await readFile(archive);
    await assert.rejects(
      run(process.execPath, [
        'scripts/search-console-opportunities.mjs',
        archive,
        '--output',
        archive,
      ]),
      /must not overwrite/,
    );
    assert.deepEqual(await readFile(archive), before);
    await assert.rejects(
      run(process.execPath, [
        'scripts/search-console-opportunities.mjs',
        archive,
        '--output',
        output,
      ]),
      /EEXIST/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
