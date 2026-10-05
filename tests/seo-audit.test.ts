import test from 'node:test';
import assert from 'node:assert/strict';
import { metadataKey, languageAlternateIssues } from '../scripts/seo-audit-checks.mjs';

test('metadata duplication is checked within a language, not across translated labels', () => {
  assert.notEqual(metadataKey('es', 'Editar PDF'), metadataKey('pt', 'Editar PDF'));
  assert.equal(metadataKey('pt', 'Editar PDF'), metadataKey('PT', 'Editar PDF'));
});

test('hreflang audit catches missing, wrong-language and nonreciprocal destinations', () => {
  const languages = {
    en: 'https://folio.example/',
    de: 'https://folio.example/de',
    'de-ch': 'https://folio.example/de',
    'x-default': 'https://folio.example/',
  };
  const pages = [
    { url: languages.en, language: 'en', languages },
    { url: languages.de, language: 'de', languages },
  ];
  assert.deepEqual(languageAlternateIssues(pages), []);
  assert.match(languageAlternateIssues([pages[0]]).join('\n'), /outside the audited pages/);
  assert.match(
    languageAlternateIssues([pages[0], { ...pages[1], languages: {} }]).join('\n'),
    /no reciprocal en link/,
  );
  assert.match(
    languageAlternateIssues([pages[0], { ...pages[1], language: 'fr' }]).join('\n'),
    /points to a fr page/,
  );
  assert.match(
    languageAlternateIssues([{ ...pages[0], languages: { de: languages.de } }, pages[1]]).join(
      '\n',
    ),
    /include its own language and URL/,
  );
  assert.deepEqual(languageAlternateIssues([{ ...pages[0], languages: {} }]), []);
});
