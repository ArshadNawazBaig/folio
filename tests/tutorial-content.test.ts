import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { consolidatedArticles, editorialHref } from '../src/lib/editorial-consolidation';
import { guides } from '../src/lib/guides';
import { guideEdition } from '../src/lib/guide-edition';
import { guideExercises, articleExercises } from '../src/lib/tutorial-exercises';
import { toolExamples } from '../src/lib/tool-examples';
import { tools } from '../src/lib/tools';
import { localizeGuide } from '../src/lib/i18n/guide-translate';
import { locales } from '../src/lib/i18n/config';
import { localizedPractice, practiceIntro } from '../src/lib/localized-tutorials';
import { starterPosts, starterPostArchive } from '../content/blog/starter-posts';
import evidence from '../src/lib/tutorial-evidence.json' with { type: 'json' };

test('consolidated tutorials have one retained destination without redirect chains or reseeding', () => {
  for (const [slug, path] of Object.entries(consolidatedArticles)) {
    assert.ok(
      path.startsWith('/guides/')
        ? guides.some((g) => path === `/guides/${g.slug}`)
        : Object.hasOwn(articleExercises, path.slice(6)),
    );
    assert.equal(editorialHref(`/blog/${slug}?source=test#old-heading`), path + '?source=test');
    assert.equal(editorialHref(path), path);
    assert.ok(!starterPosts.some((p) => p.draft.slug === slug));
  }
  assert.equal(editorialHref('/blog/constructor'), '/blog/constructor');
  assert.equal(
    editorialHref('https://elsewhere.example/blog/how-to-edit-pdf-on-phone'),
    'https://elsewhere.example/blog/how-to-edit-pdf-on-phone',
  );
  assert.equal(starterPostArchive.length, 15);
  assert.equal(starterPosts.length, 8);
});

test('all active tool and guide tutorials expose a specific practice case and a comparison', () => {
  for (const tool of tools.filter((t) => t.available)) {
    const example = toolExamples[tool.slug];
    assert.ok(example?.settings.length >= 3, tool.slug);
    assert.ok(tool.slug === 'url-shortener' || example.results?.length, tool.slug);
  }
  for (const original of guides) {
    const guide = guideEdition(original);
    assert.equal(
      new Set(guide.sections.map((s) => s.title)).size,
      guide.sections.length,
      guide.slug,
    );
    const hrefs = guide.sections.flatMap((s) => (s.links || []).map((l) => l.href));
    assert.ok(
      hrefs.some((h) => h.startsWith('/samples/')),
      guide.slug,
    );
    assert.ok(
      Object.hasOwn(guideExercises, guide.slug) ||
        ['how-to-add-text-to-a-pdf', 'how-to-combine-images-into-pdf'].includes(guide.slug),
    );
  }
  assert.equal(new Set(Object.values(articleExercises).map((e) => e.title)).size, 10);
});

test('all twelve languages have localized practice instructions and valid per-guide samples', async () => {
  for (const locale of locales) {
    const messages: Record<string, string> = Object.assign(
      {},
      ...(await Promise.all(
        ['feature-messages', 'site-messages', 'messages', 'dashboard-messages'].map(
          async (folder) => {
            const data = JSON.parse(
              await readFile(`src/lib/i18n/${folder}/${locale}.json`, 'utf8'),
            );
            return folder === 'messages' ? data.ui : data;
          },
        ),
      )),
    );
    for (const tool of tools.filter((t) => t.available)) {
      const example = localizedPractice(tool.slug, messages);
      assert.ok(example.checks.length, `${locale}: ${tool.slug}`);
      assert.ok(example.inputs.length || example.outputs.length, `${locale}: ${tool.slug}`);
      if (locale !== 'en') {
        assert.notEqual(example.text, practiceIntro, locale);
        assert.notEqual(example.title, 'Compare a worked example', locale);
      }
    }
    if (locale !== 'en')
      for (const source of guides) {
        const guide = localizeGuide(source, messages, locale);
        assert.equal(
          guide.sections.at(-1)?.text,
          messages[practiceIntro],
          `${locale}: ${guide.slug}`,
        );
        assert.ok(guide.sections.at(-1)?.links?.length);
      }
  }
});

test('every generated tutorial download matches its evidence record', async () => {
  for (const file of Object.values(evidence.files)) {
    const bytes = await readFile(`public${file.href}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.href);
    assert.ok(bytes.length > 0, file.href);
  }
});

async function text(name: string) {
  const task = getDocument({
    data: new Uint8Array(await readFile(`public/samples/tutorials/${name}`)),
    useSystemFonts: true,
  });
  try {
    const pdf = await task.promise;
    const result = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      result.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return result;
  } finally {
    await task.destroy();
  }
}
test('the comparison files demonstrate one correction, selective repeated replacement, and different text layers', async () => {
  const single = (await text('wording-one-correction.pdf')).join(' ');
  const repeated = (await text('wording-replaced.pdf')).join(' ');
  assert.equal(single.match(/Venue: Room 7/g)?.length, 1);
  assert.equal(single.match(/Venue: Room 4/g)?.length, 2);
  assert.equal(repeated.match(/Venue: Room 7/g)?.length, 3);
  assert.ok(repeated.includes('Archive: Room 40'));
  const layers = await text('text-layer-diagnostic.pdf');
  assert.ok(layers[0].includes('Orchard 42'));
  assert.equal(layers[1].trim(), '');
  assert.ok(layers[2].includes('Orchard 42'));
  const master = await PDFDocument.load(
    await readFile('public/samples/tutorials/workshop-form-master.pdf'),
  );
  const flat = await PDFDocument.load(
    await readFile('public/samples/tutorials/workshop-form-flattened.pdf'),
  );
  assert.equal(master.getForm().getFields().length, 2);
  assert.equal(flat.getForm().getFields().length, 0);
  assert.ok((await text('workshop-form-flattened.pdf'))[0].includes('Sam Example'));
});
