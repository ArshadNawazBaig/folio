import { toolExamples } from '@/lib/tool-examples';
import styles from './tool-example.module.css';

export function ToolExample({ slug }: { slug: string }) {
  const example = toolExamples[slug];
  if (!example) return null;
  return (
    <section className={styles.example} id="worked-example" aria-labelledby="worked-example-title">
      <div>
        <span className="eyebrow">A PRACTICAL EXAMPLE</span>
        <h2 id="worked-example-title">{example.title}</h2>
        <p>{example.scenario}</p>
        {example.samples && (
          <div className={styles.samples}>
            <h3>Try with a practice file</h3>
            <p>Original, fictional samples. Download a file, then select it in the tool above.</p>
            <ul>
              {example.samples.map((sample) => (
                <li key={sample.href}>
                  <a href={sample.href} download>
                    {sample.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <dl>
          {example.settings.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3>Check the result</h3>
        <p>{example.check}</p>
        <p className={styles.note}>{example.note}</p>
      </div>
    </section>
  );
}
