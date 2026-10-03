import { translator, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { downloadFact, toolFacts } from '@/lib/tool-facts';
import type { Tool } from '@/lib/tools';
import styles from './tool-facts.module.css';

export function ToolFacts({ tool, messages = {} }: PageLanguage & { tool: Tool }) {
  const tr = translator(messages);
  const facts = toolFacts[tool.slug];
  if (!tool.available || !facts) return null;
  const rows = [
    ['Input', facts.input],
    ['Output', facts.output],
    [tool.slug === 'url-shortener' ? 'Plans' : 'Download cost', downloadFact(tool.slug)],
    [tool.slug === 'url-shortener' ? 'Link handling' : 'File handling', facts.processing],
    ['Limits to know', facts.limits],
  ];
  return (
    <section className={styles.facts} id="tool-facts" aria-labelledby="tool-facts-title">
      <div className={styles.intro}>
        <span className="eyebrow">{tr('BEFORE YOU START')}</span>
        <h2 id="tool-facts-title">{tr(facts.question)}</h2>
        <p>{tr(facts.answer)}</p>
        {!['url-shortener', 'invoice-generator'].includes(tool.slug) && (
          <Link href="/guides/does-folio-upload-pdf-files">
            {tr('Compare local processing and cloud saving')}
          </Link>
        )}
      </div>
      <div>
        <dl className={styles.rows}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{tr(label)}</dt>
              <dd>{tr(value)}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.links}>
          <Link href="/pricing">{tr('Current plans')}</Link>
          <Link href="/privacy">{tr('Full privacy details')}</Link>
        </p>
      </div>
    </section>
  );
}
