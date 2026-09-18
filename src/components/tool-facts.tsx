import Link from 'next/link';
import { downloadFact, toolFacts } from '@/lib/tool-facts';
import type { Tool } from '@/lib/tools';
import styles from './tool-facts.module.css';

export function ToolFacts({ tool }: { tool: Tool }) {
  const facts = toolFacts[tool.slug];
  if (!tool.available || !facts) return null;
  const rows = [
    ['Input', facts.input],
    ['Output', facts.output],
    ['Download cost', downloadFact(tool.slug)],
    ['File handling', facts.processing],
    ['Limits to know', facts.limits],
  ];
  return (
    <section className={styles.facts} id="tool-facts" aria-labelledby="tool-facts-title">
      <div className={styles.intro}>
        <span className="eyebrow">BEFORE YOU START</span>
        <h2 id="tool-facts-title">{facts.question}</h2>
        <p>{facts.answer}</p>
        <Link href="/guides/does-folio-upload-pdf-files">
          Compare local processing and cloud saving
        </Link>
      </div>
      <div>
        <dl className={styles.rows}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.links}>
          <Link href="/pricing">Current plans</Link>
          <Link href="/privacy">Full privacy details</Link>
        </p>
      </div>
    </section>
  );
}
