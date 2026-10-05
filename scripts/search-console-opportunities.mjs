import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import JSZip from 'jszip';

// Offline analysis only. No credentials, requests, estimated search volumes or traffic forecasts.
export function parseCsv(source) {
  const rows = [];
  let row = [],
    field = '',
    quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(field);
      field = '';
      if (c !== ',') {
        if (row.some((cell) => cell.trim())) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      }
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed quoted field in CSV. Export again from Search Console.');
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function metric(value, label, rowNumber, whole = false) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))
    throw new Error(
      `Row ${rowNumber}: invalid ${label}. Use an English, non-comparison CSV export.`,
    );
  const number = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(number) || (whole && !Number.isSafeInteger(number)))
    throw new Error(`Row ${rowNumber}: invalid ${label}.`);
  return number;
}

export function analyzeCsv(source, { name = 'export.csv', minImpressions = 20 } = {}) {
  const [header, ...data] = parseCsv(source);
  if (!header) throw new Error(`${name}: empty export.`);
  const keys = header.map((key) => key.trim().toLowerCase());
  const queryIndex = keys.findIndex((key) => ['top queries', 'query', 'queries'].includes(key));
  const pageIndex = keys.findIndex((key) => ['top pages', 'page', 'pages'].includes(key));
  if (queryIndex < 0 && pageIndex < 0) return null;
  if (queryIndex >= 0 && pageIndex >= 0)
    throw new Error(`${name}: use separate standard Queries and Pages CSV exports.`);
  const dimension = queryIndex >= 0 ? 'query' : 'page';
  const index = queryIndex >= 0 ? queryIndex : pageIndex;
  const columns = ['clicks', 'impressions', 'position'].map((key) => keys.indexOf(key));
  if (columns.some((column) => column < 0))
    throw new Error(
      `${name}: requires Clicks, Impressions and Position. Export without date comparison, using English headers.`,
    );
  const seen = new Set();
  const rows = data.map((cells, offset) => {
    const rowNumber = offset + 2;
    if (cells.length !== header.length)
      throw new Error(`${name}, row ${rowNumber}: inconsistent CSV columns.`);
    const value = cells[index].trim();
    if (!value || seen.has(value))
      throw new Error(
        `${name}, row ${rowNumber}: empty or repeated ${dimension}. Do not combine date periods.`,
      );
    seen.add(value);
    const [clicks, impressions, position] = columns.map((column, i) =>
      metric(cells[column], keys[column], rowNumber, i < 2),
    );
    if (clicks > impressions)
      throw new Error(`${name}, row ${rowNumber}: clicks exceed impressions.`);
    const possibleBrandQuery =
      dimension === 'query' && /\bfolio\b|thebestfreepdf(?:\.com)?/i.test(value);
    const hasPosition = impressions > 0 && position >= 1;
    const enoughData = impressions >= minImpressions && hasPosition;
    let action = 'Collect more observations before choosing a rewrite.';
    let reviewGroup = 'limited-data';
    if (possibleBrandQuery) {
      reviewGroup = 'possible-brand';
      action = 'Inspect separately from nonbranded discovery; a brand match is a heuristic.';
    } else if (enoughData && position <= 10 && clicks === 0) {
      reviewGroup = 'visible-without-clicks';
      action =
        'Review the actual query intent, country, device and search result before testing a clearer title or description.';
    } else if (enoughData && position >= 4 && position <= 20) {
      reviewGroup = 'existing-visibility';
      action =
        'Check the corresponding page/query in Search Console; test one relevant content or internal-link improvement.';
    } else if (enoughData && position < 4) {
      reviewGroup = 'preserve-and-learn';
      action =
        'Inspect what is already attracting visitors; avoid an unsupported rewrite of a working page.';
    } else if (enoughData) {
      reviewGroup = 'review-task-fit';
      action =
        'Check task fit, indexing/canonical status and useful discovery links before prioritizing this over visible pages.';
    }
    return {
      [dimension]: value,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      averagePosition: hasPosition ? position : null,
      possibleBrandQuery,
      reviewGroup,
      action,
    };
  });
  const order = [
    'visible-without-clicks',
    'existing-visibility',
    'preserve-and-learn',
    'review-task-fit',
    'limited-data',
    'possible-brand',
  ];
  rows.sort(
    (a, b) =>
      order.indexOf(a.reviewGroup) - order.indexOf(b.reviewGroup) ||
      b.impressions - a.impressions ||
      a[dimension].localeCompare(b[dimension]),
  );
  return { file: name, dimension, exportedRows: rows.length, rows };
}

export async function loadExports(filename) {
  const bytes = await readFile(filename);
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Use an export smaller than 20 MB.');
  if (!filename.toLowerCase().endsWith('.zip'))
    return [{ name: filename, text: bytes.toString('utf8') }];
  const zip = await JSZip.loadAsync(bytes);
  const files = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.toLowerCase().endsWith('.csv')) continue;
    const text = await entry.async('string');
    if (text.length > 20 * 1024 * 1024) throw new Error('A CSV in the archive exceeds 20 MB.');
    files.push({ name: `${filename}:${entry.name}`, text });
  }
  return files;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      period: { type: 'string' },
      context: { type: 'string' },
      output: { type: 'string' },
      'min-impressions': { type: 'string', default: '20' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(
      'Usage: npm run seo:opportunities -- export.zip [Queries.csv Pages.csv] --period YYYY-MM-DD:YYYY-MM-DD --context "Web; all countries; all devices" --output /tmp/seo-opportunities.json\nEnglish CSV/ZIP exports; disable date comparison. No network connection. The report labels review hypotheses, not promised wins.',
    );
    return;
  }
  if (!positionals.length)
    throw new Error(
      'Provide a Search Console CSV or ZIP export. Run with --help for instructions.',
    );
  const minImpressions = Number(values['min-impressions']);
  if (!Number.isSafeInteger(minImpressions) || minImpressions < 1)
    throw new Error('--min-impressions must be a positive whole number.');
  const reports = [],
    ignoredFiles = [];
  for (const filename of positionals) {
    for (const entry of await loadExports(filename)) {
      const report = analyzeCsv(entry.text, { name: entry.name, minImpressions });
      if (report) reports.push(report);
      else ignoredFiles.push(entry.name);
    }
  }
  if (!reports.length)
    throw new Error(
      'No Queries or Pages table found. Use the English Search results report CSV export.',
    );
  const report = {
    generatedAt: new Date().toISOString(),
    period: values.period ?? 'Not supplied: confirm the date range before acting.',
    context:
      values.context ?? 'Not supplied: confirm property, search type, country, device and filters.',
    minImpressions,
    notes: [
      'Review groups and thresholds are editorial heuristics, not Google benchmarks, forecasts or proof of causation.',
      'Average position is not a fixed rank; validate query, country, device and landing page before editing.',
      'Queries and Pages are kept separate. These exports do not establish query-to-page pairs or cannibalization.',
      'Rows can be omitted/anonymized/truncated. Row sums are not site totals; absence is not proof of no traffic or no indexing.',
      'No CTR benchmark or traffic estimate is invented. CTR is calculated from each row’s clicks and impressions.',
      'No files were uploaded and no external service or paid API was called.',
    ],
    ignoredFiles,
    reports,
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  if (values.output) {
    const destination = resolve(values.output);
    if (positionals.some((filename) => resolve(filename) === destination))
      throw new Error('Output must not overwrite an input export.');
    await writeFile(destination, json, { flag: 'wx' });
    console.log(
      `Saved ${reports.length} separate table(s) to ${destination}. No external requests made.`,
    );
  } else console.log(json);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
