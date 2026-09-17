import { Plus } from 'lucide-react';
import { StructuredData } from './structured-data';
export function Faq({ items }: { items: [string, string][] }) {
  return (
    <div className="faq-list">
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map(([question, answer]) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }}
      />
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <Plus size={18} />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
