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

export function EditorPreview() {
  return (
    <div className={styles.preview} aria-label="Preview of the Folio PDF editor">
      <div className={styles.titlebar}>
        <FileText size={15} aria-hidden="true" />
        <span>Project proposal.pdf</span>
        <span className={styles.saved}>
          <Check size={12} aria-hidden="true" />
          Sample
        </span>
        <Link prefetch={false} href="/workspace?sample=proposal">
          Open sample <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
      <div className={styles.toolbar}>
        <Link
          prefetch={false}
          href="/workspace?sample=proposal"
          className={styles.active}
          aria-label="Try the selection tool"
        >
          <MousePointer2 size={14} /> <span>Select</span>
        </Link>
        <Link
          prefetch={false}
          href="/workspace?sample=proposal&mode=text"
          aria-label="Try adding text"
        >
          <Type size={15} />
          <span>Text</span>
        </Link>
        <Link
          prefetch={false}
          href="/workspace?sample=proposal&mode=highlight"
          aria-label="Try highlighting"
        >
          <Highlighter size={15} />
          <span>Highlight</span>
        </Link>
        <Link
          prefetch={false}
          href="/workspace?sample=proposal&mode=signature"
          aria-label="Try signing"
        >
          <Signature size={16} />
          <span>Sign</span>
        </Link>
        <Link
          prefetch={false}
          href="/workspace?sample=proposal"
          aria-label="Explore page organization"
        >
          <PanelsTopLeft size={14} />
          <span>Pages</span>
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
              PROJECT / 2026 <ArrowUpRight size={14} aria-hidden="true" />
            </div>
            <h3>Project proposal</h3>
            <p className={styles.paperSubtitle}>A clear plan for what comes next.</p>
            <p>
              Good work starts with a shared direction. This proposal brings our ideas, next steps
              and deliverables together.
            </p>
            <p>
              <mark>A simpler way to move your next project forward.</mark>
            </p>
            <h4>Project scope</h4>
            <div className={styles.scope}>
              <strong>Phase</strong>
              <strong>Deliverables</strong>
              <span>Discovery</span>
              <span>Goals and a clear direction</span>
              <span>Design</span>
              <span>Ideas, details and revisions</span>
              <span>Delivery</span>
              <span>Everything ready to go</span>
            </div>
            <p className={styles.signoff}>Looking forward to working together.</p>
            <span className={styles.signature}>Alex Carter</span>
            <div className={styles.signatureLine} />
            <small>Alex Carter · Project lead</small>
          </div>
        </div>
      </div>
    </div>
  );
}
