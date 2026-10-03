import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  locales,
  localeInfo,
  translatedPaths,
  translatedToolSlugs,
  languagePath,
  languageSwitchPath,
  languageAlternates,
  splitLanguagePath,
} from '../src/lib/i18n/config';

test('language links preserve translated pages and never invent untranslated destinations', () => {
  assert.ok(locales.length >= 10);
  for (const locale of locales) {
    for (const path of translatedPaths) {
      const url = languagePath(locale, path);
      assert.deepEqual(splitLanguagePath(url), { locale, path });
      assert.equal(languageSwitchPath(url, 'en'), path);
      assert.equal(languageSwitchPath(url, 'ja'), languagePath('ja', path));
    }
    if (locale !== 'en') {
      assert.equal(
        languageSwitchPath('/blog/how-to-merge', locale),
        `/${locale}/blog/how-to-merge`,
      );
      assert.equal(languageSwitchPath('/workspace', locale), '/workspace');
    }
  }
});

test('international alternates use one canonical URL per language and include priority regions', () => {
  for (const path of translatedPaths) {
    const alternates = languageAlternates(path, 'https://folio.example')!;
    assert.equal(alternates['x-default'], `https://folio.example${path}`);
    for (const locale of locales) {
      assert.equal(alternates[locale], `https://folio.example${languagePath(locale, path)}`);
      for (const region of localeInfo[locale].regions)
        assert.equal(alternates[region], alternates[locale]);
    }
    for (const region of ['en-US', 'en-GB', 'en-AU', 'en-CA', 'de-CH', 'nb-NO', 'ja-JP'])
      assert.ok(alternates[region]);
  }
  for (const path of ['/workspace', '/tools?q=PDF', '/blog/example'])
    assert.equal(languageAlternates(path, 'https://folio.example'), undefined);
});

test('every advertised language has complete, nonempty page content and matching UI placeholders', async () => {
  const dictionaries = await Promise.all(
    locales.map(async (locale) =>
      JSON.parse(
        await readFile(new URL(`../src/lib/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
      ),
    ),
  );
  const english = dictionaries[0];
  for (const [i, dictionary] of dictionaries.entries()) {
    const locale = locales[i];
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(english).sort(), locale);
    assert.deepEqual(
      Object.keys(dictionary.catalog).sort(),
      [...translatedToolSlugs].sort(),
      locale,
    );
    assert.deepEqual(Object.keys(dictionary.ui).sort(), Object.keys(english.ui).sort(), locale);
    for (const [key, value] of Object.entries(dictionary))
      if (typeof value === 'string') assert.ok(value.trim(), `${locale}.${key}`);
    if (locale !== 'en') assert.notEqual(dictionary.heading, english.heading);
    assert.notEqual(dictionary.description, dictionary.directoryDescription);
    assert.equal(dictionary.faq.length, 3);
    for (const pair of dictionary.faq)
      assert.ok(pair.length === 2 && pair.every((text: string) => text.trim().length > 10));
    for (const slug of translatedToolSlugs) {
      const tool = dictionary.catalog[slug];
      assert.equal(tool.steps.length, 3);
      assert.ok(tool.steps.every((step: string) => step.trim()));
      for (const key of ['name', 'description', 'detail', 'action'])
        assert.ok(tool[key].trim(), `${locale}.${slug}.${key}`);
      assert.ok(tool.detail.length > 70);
    }
    for (const [key, text] of Object.entries<string>(dictionary.ui)) {
      assert.ok(text.trim(), `${locale}.${key}`);
      assert.deepEqual(
        (text.match(/\{\w+\}/g) ?? []).sort(),
        (key.match(/\{\w+\}/g) ?? []).sort(),
        `${locale}.${key}`,
      );
    }
  }
});

test('shared page translations cover the same content with valid interpolation in every language', async () => {
  const english: Record<string, string> = JSON.parse(
    await readFile(new URL('../src/lib/i18n/site-messages/en.json', import.meta.url), 'utf8'),
  );
  for (const locale of locales) {
    const messages: Record<string, string> = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/site-messages/${locale}.json`, import.meta.url),
        'utf8',
      ),
    );
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort(), locale);
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(value.trim(), `${locale}: ${key}`);
      assert.deepEqual(
        (value.match(/\{\w+\}/g) ?? []).sort(),
        (key.match(/\{\w+\}/g) ?? []).sort(),
        `${locale}: ${key}`,
      );
    }
  }
});

test('localized internal links preserve filters, anchors and untranslated resource destinations', async () => {
  const { localizedHref } = await import('../src/lib/i18n/translate');
  assert.equal(
    localizedHref('de', '/tools?category=Convert&q=PDF#results'),
    '/de/tools?category=Convert&q=PDF#results',
  );
  assert.equal(localizedHref('ja', '/merge-pdf'), '/ja/merge-pdf');
  assert.equal(localizedHref('fr', '/fr/merge-pdf'), '/fr/merge-pdf');
  assert.equal(
    localizedHref('ko', '/guides/how-to-merge-pdf-files'),
    '/guides/how-to-merge-pdf-files',
  );
  assert.equal(localizedHref('it', '/workspace?sample=proposal'), '/workspace?sample=proposal');
  assert.equal(localizedHref('en', '/tools?q=PDF'), '/tools?q=PDF');
});

test('dashboard languages share complete copy and stay separate from public SEO routes', async () => {
  const { translatedPrivatePaths } = await import('../src/lib/i18n/config');
  const english: Record<string, string> = JSON.parse(
    await readFile(new URL('../src/lib/i18n/dashboard-messages/en.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(translatedPrivatePaths, ['/dashboard', '/account', '/support', '/maintenance']);
  for (const locale of locales) {
    const messages: Record<string, string> = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/dashboard-messages/${locale}.json`, import.meta.url),
        'utf8',
      ),
    );
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort(), locale);
    for (const [key, value] of Object.entries(messages)) {
      assert.ok(value.trim(), `${locale}: ${key}`);
      assert.deepEqual(
        (value.match(/\{\w+\}/g) ?? []).sort(),
        (key.match(/\{\w+\}/g) ?? []).sort(),
        `${locale}: ${key}`,
      );
    }
    assert.equal(languageSwitchPath('/de/dashboard', locale), languagePath(locale, '/dashboard'));
    assert.equal(
      languageAlternates(languagePath(locale, '/dashboard'), 'https://folio.example'),
      undefined,
    );
    assert.ok(!translatedPaths.includes('/dashboard'));
  }
});

test('feature translations cover every key and preserve interpolation values', async () => {
  const english: Record<string, string> = JSON.parse(
    await readFile(new URL('../src/lib/i18n/feature-messages/en.json', import.meta.url), 'utf8'),
  );
  for (const locale of locales) {
    const copy: Record<string, string> = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/feature-messages/${locale}.json`, import.meta.url),
        'utf8',
      ),
    );
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(english).sort(), locale);
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value.trim(), `${locale}: ${key}`);
      assert.deepEqual(
        (value.match(/\{\w+\}/g) ?? []).sort(),
        (key.match(/\{\w+\}/g) ?? []).sort(),
        `${locale}: ${key}`,
      );
    }
  }
});

test('translated route inventory includes every tool and authored guide', async () => {
  const [{ tools }, { guides }, { toolPaths, guidePaths }] = await Promise.all([
    import('../src/lib/tools'),
    import('../src/lib/guides'),
    import('../src/lib/i18n/routes'),
  ]);
  assert.deepEqual([...toolPaths].sort(), tools.map((t) => `/${t.slug}`).sort());
  assert.deepEqual([...guidePaths].sort(), guides.map((g) => `/guides/${g.slug}`).sort());
  assert.equal(languageSwitchPath('/de/pricing', 'ja'), '/ja/pricing');
  assert.equal(languageSwitchPath('/fr/account', 'it'), '/it/account');
});
