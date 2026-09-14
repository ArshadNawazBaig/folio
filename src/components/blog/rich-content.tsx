import type { CSSProperties, ReactNode } from 'react';
import { safeBlogUrl, type RichNode } from '@/lib/blog';
import s from './blog.module.css';

function renderNode(node: RichNode, key: string): ReactNode {
  const a = node.attrs || {};
  const children = node.content?.map((n, i) => renderNode(n, `${key}-${i}`));
  const style: CSSProperties = ['left', 'center', 'right', 'justify'].includes(String(a.textAlign))
    ? { textAlign: a.textAlign as CSSProperties['textAlign'] }
    : {};
  if (node.type === 'text') {
    let text: ReactNode = node.text || '';
    for (const [i, mark] of (node.marks || []).entries()) {
      const k = `${key}-m${i}`;
      if (mark.type === 'bold') text = <strong key={k}>{text}</strong>;
      if (mark.type === 'italic') text = <em key={k}>{text}</em>;
      if (mark.type === 'underline') text = <u key={k}>{text}</u>;
      if (mark.type === 'strike') text = <s key={k}>{text}</s>;
      if (mark.type === 'code') text = <code key={k}>{text}</code>;
      if (mark.type === 'highlight') text = <mark key={k}>{text}</mark>;
      if (mark.type === 'link') {
        const href = safeBlogUrl(mark.attrs?.href);
        if (href)
          text = (
            <a key={k} href={href} rel="noopener noreferrer">
              {text}
            </a>
          );
      }
    }
    return <span key={key}>{text}</span>;
  }
  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return (
        <p key={key} style={style}>
          {children || <br />}
        </p>
      );
    case 'heading':
      return a.level === 2 ? (
        <h2 key={key} style={style}>
          {children}
        </h2>
      ) : a.level === 3 ? (
        <h3 key={key} style={style}>
          {children}
        </h3>
      ) : (
        <h4 key={key} style={style}>
          {children}
        </h4>
      );
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={Number.isInteger(a.start) ? Number(a.start) : 1}>
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key} tabIndex={0} role="region" aria-label="Code block">
          <code>{children}</code>
        </pre>
      );
    case 'hardBreak':
      return <br key={key} />;
    case 'horizontalRule':
      return <hr key={key} />;
    case 'image': {
      const src = safeBlogUrl(a.src, true);
      return src ? (
        <img
          key={key}
          src={src}
          alt={typeof a.alt === 'string' ? a.alt.slice(0, 300) : ''}
          loading="lazy"
        />
      ) : null;
    }
    case 'table':
      return (
        <div
          key={key}
          className={s.tableWrap}
          tabIndex={0}
          role="region"
          aria-label="Article table"
        >
          <table>
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case 'tableRow':
      return <tr key={key}>{children}</tr>;
    case 'tableCell':
    case 'tableHeader': {
      const Tag = node.type === 'tableHeader' ? 'th' : 'td';
      return (
        <Tag
          key={key}
          colSpan={Math.max(1, Math.min(12, Number(a.colspan) || 1))}
          rowSpan={Math.max(1, Math.min(50, Number(a.rowspan) || 1))}
        >
          {children}
        </Tag>
      );
    }
    default:
      return null;
  }
}
export function RichContent({ content }: { content: RichNode }) {
  return <div className={s.prose}>{renderNode(content, 'article')}</div>;
}
