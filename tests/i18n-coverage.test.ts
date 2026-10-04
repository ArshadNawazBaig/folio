import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { locales } from '../src/lib/i18n/config';

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? sourceFiles(file) : [file];
      }),
    )
  ).flat();
}

test('active interface and authored page copy has translations, including new source strings', async () => {
  const contentFiles = new Set([
    'src/lib/guides.ts',
    'src/lib/invoice-guide.ts',
    'src/lib/tools.ts',
    'src/lib/native-tools.ts',
    'src/lib/tool-facts.ts',
    'src/components/home-page-content.tsx',
  ]);
  const active = new Map<string, Set<string>>();
  const add = (message: string, file: string) => {
    // Short labels may legitimately be brand names, units or shared loanwords.
    if (message.length < 25 || !/[A-Za-z].*\s.*[A-Za-z]/.test(message)) return;
    if (!active.has(message)) active.set(message, new Set());
    active.get(message)!.add(file);
  };
  for (const file of (await sourceFiles('src')).filter(
    (file) => /\.tsx?$/.test(file) && !file.includes('/i18n/'),
  )) {
    const tree = ts.createSourceFile(
      file,
      await readFile(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const literal = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node)) add(node.text, file);
      else if (ts.isConditionalExpression(node)) {
        literal(node.whenTrue);
        literal(node.whenFalse);
      }
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        /^(tr|t|translate)$/.test(node.expression.getText(tree)) &&
        node.arguments[0]
      )
        literal(node.arguments[0]);
      if (
        ts.isStringLiteralLike(node) &&
        (contentFiles.has(file) ||
          (ts.isJsxAttribute(node.parent) && node.parent.name.getText(tree) === 'hint'))
      ) {
        let parent: ts.Node | undefined = node.parent;
        let keyword = false;
        while (parent) {
          if (ts.isPropertyAssignment(parent) && parent.name.getText(tree) === 'keywords')
            keyword = true;
          parent = parent.parent;
        }
        if (!keyword && !node.text.startsWith('/')) add(node.text, file);
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  const failures: string[] = [];
  for (const locale of locales) {
    const [features, site, common, dashboard] = await Promise.all(
      ['feature-messages', 'site-messages', 'messages', 'dashboard-messages'].map(async (folder) =>
        JSON.parse(await readFile(`src/lib/i18n/${folder}/${locale}.json`, 'utf8')),
      ),
    );
    const messages = { ...features, ...site, ...common.ui, ...dashboard };
    for (const [message, files] of active) {
      if (
        !messages[message] ||
        (locale !== 'en' &&
          messages[message] === message &&
          message !== '{value0} × {value1} pixels')
      ) {
        failures.push(`${locale}: ${message} (${[...files].join(', ')})`);
      }
      if ([...files].some((file) => file.includes('/dashboard/')) && !dashboard[message]) {
        failures.push(`${locale}: missing dashboard message: ${message}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});
