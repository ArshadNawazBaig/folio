import { localizedPractice } from '@/lib/localized-tutorials';
import styles from './tool-example.module.css';

export function LocalizedToolExample({
  slug,
  messages,
}: {
  slug: string;
  messages: Record<string, string>;
}) {
  const example = localizedPractice(slug, messages);
  const tr = (text: string) => messages[text] ?? text;
  return (
    <section id="worked-example" className={styles.example} aria-labelledby="worked-example-title">
      <div>
        <h2 id="worked-example-title">{example.title}</h2>
        <p>{example.text}</p>
        <div className={styles.samples}>
          <ul>
            {[...example.inputs, ...example.outputs].map((file) => (
              <li key={file.label}>
                <a href={file.href} download>
                  {file.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h3>{tr('Checks for this example')}</h3>
        <dl>
          {example.checks.map((check) => (
            <div key={check.name}>
              <dt>{check.name}</dt>
              <dd>{check.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
