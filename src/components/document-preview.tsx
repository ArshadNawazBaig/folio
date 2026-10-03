import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import {
  MousePointer2,
  Type,
  Highlighter,
  Signature,
  ArrowUpRight,
  Check,
  FileText,
  PanelsTopLeft,
} from 'lucide-react';
import styles from './document-preview.module.css';

export function EditorPreview({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  return (
    <div className={styles.preview} aria-label={tr('Preview of the Folio PDF editor')}>
      <div className={styles.titlebar}>
        <FileText size={15} aria-hidden="true" />
        <span>{tr('Project proposal.pdf')}</span>
        <span className={styles.saved}>
          <Check size={12} aria-hidden="true" />
          {tr('Sample')}
        </span>
        <Link prefetch={false} href={href('/workspace?sample=proposal')}>
          {tr('Open sample')} <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.toolbar}>
        <Link
          prefetch={false}
          href={href('/workspace?sample=proposal')}
          className={styles.active}
          aria-label={tr('Try the selection tool')}
        >
          <MousePointer2 size={14} /> <span>{tr('Select')}</span>
        </Link>
        <Link
          prefetch={false}
          href={href('/workspace?sample=proposal&mode=text')}
          aria-label={tr('Try adding text')}
        >
          <Type size={15} />
          <span>{tr('Text')}</span>
        </Link>
        <Link
          prefetch={false}
          href={href('/workspace?sample=proposal&mode=highlight')}
          aria-label={tr('Try highlighting')}
        >
          <Highlighter size={15} />
          <span>{tr('Highlight')}</span>
        </Link>
        <Link
          prefetch={false}
          href={href('/workspace?sample=proposal&mode=signature')}
          aria-label={tr('Try signing')}
        >
          <Signature size={16} />
          <span>{tr('Sign')}</span>
        </Link>
        <Link
          prefetch={false}
          href={href('/workspace?sample=proposal')}
          aria-label={tr('Explore page organization')}
        >
          <PanelsTopLeft size={14} />
          <span>{tr('Pages')}</span>
        </Link>
      </div>
      <div className={styles.body}>
        <div className={styles.thumbnails} aria-hidden="true">
          {[1, 2, 3].map((page) => (
            <div key={page}>
              <div className={`${styles.thumbnail} ${page === 1 ? styles.selected : ''}`}>
                <b />
                <i />
                <i />
                <i />
                <i />
                <span />
                <i />
                <i />
              </div>
              <small>{page}</small>
            </div>
          ))}
        </div>
        <div className={styles.canvas}>
          <div className={styles.paper}>
            <div className={styles.paperTop}>
              {tr('PROJECT / 2026')} <ArrowUpRight size={14} aria-hidden="true" />
            </div>
            <h3>{tr('Project proposal')}</h3>
            <p className={styles.paperSubtitle}>{tr('A clear plan for what comes next.')}</p>
            <p>
              {tr(
                'Good work starts with a shared direction. This proposal brings our ideas, next steps and deliverables together.',
              )}
            </p>
            <p>
              <mark>{tr('A simpler way to move your next project forward.')}</mark>
            </p>
            <h4>{tr('Project scope')}</h4>
            <div className={styles.scope}>
              <strong>{tr('Phase')}</strong>
              <strong>{tr('Deliverables')}</strong>
              <span>{tr('Discovery')}</span>
              <span>{tr('Goals and a clear direction')}</span>
              <span>{tr('Design')}</span>
              <span>{tr('Ideas, details and revisions')}</span>
              <span>{tr('Delivery')}</span>
              <span>{tr('Everything ready to go')}</span>
            </div>
            <p className={styles.signoff}>{tr('Looking forward to working together.')}</p>
            <span className={styles.signature}>{tr('Alex Carter')}</span>
            <div className={styles.signatureLine} />
            <small>{tr('Alex Carter · Project lead')}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
