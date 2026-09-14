'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { setPendingDocument } from '@/lib/storage';
import { friendlyError } from '@/lib/utils';
const templates = [
  {
    id: 'project',
    title: 'Project inquiry',
    category: 'Business',
    subtitle: 'Get a good idea of the big picture.',
    heading: 'Let’s start\nsomething good.',
    color: 'sand',
  },
  {
    id: 'onboarding',
    title: 'Team introduction',
    category: 'HR',
    subtitle: 'Make the first hello feel easy.',
    heading: 'Welcome to\nthe team.',
    color: 'sage',
  },
  {
    id: 'feedback',
    title: 'Thoughtful feedback',
    category: 'Personal',
    subtitle: 'A little perspective goes a long way.',
    heading: 'Your perspective\nmatters.',
    color: 'rose',
  },
];
export function FormTemplates() {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [category, setCategory] = useState('All templates');
  const [error, setError] = useState('');
  async function open(id: string, title: string) {
    setBusy(id);
    setError('');
    try {
      const { createSample } = await import('@/lib/sample');
      setPendingDocument({ name: `${title}.pdf`, bytes: await createSample(id) });
      router.push('/workspace?mode=form-fill');
    } catch (e) {
      setError(friendlyError(e));
      setBusy('');
    }
  }
  return (
    <>
      <div className="category-tabs form-tabs">
        {['All templates', 'Business', 'HR', 'Personal'].map((c) => (
          <button
            className={category === c ? 'active' : ''}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            key={c}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="template-grid">
        {templates
          .filter((t) => category === 'All templates' || t.category === category)
          .map((t) => (
            <button
              className="template-card"
              key={t.id}
              disabled={!!busy}
              onClick={() => open(t.id, t.title)}
            >
              <div className={`template-preview ${t.color}`}>
                <div className="template-paper">
                  <span>FOLIO / A GOOD START</span>
                  <h3>{t.heading}</h3>
                  {['Your name', 'Email address', 'A little more about you'].map((l) => (
                    <div className="template-field" key={l}>
                      <span>{l}</span>
                      <i />
                    </div>
                  ))}
                  <small>MADE FOR THE DETAILS.</small>
                </div>
              </div>
              <div className="template-info">
                <span>{t.category} · Fillable PDF</span>
                <h3>
                  {t.title}
                  {busy === t.id ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </h3>
                <p>{t.subtitle}</p>
              </div>
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p className="template-disclaimer">
        Original Folio templates for everyday use. These are sample documents, not official or legal
        forms.
      </p>
    </>
  );
}
