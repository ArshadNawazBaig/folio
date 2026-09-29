import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ToolSummary } from '@/lib/tool-summary';
import { ToolIcon } from './icon';
import s from './tool-grid.module.css';

const descriptions: Record<string, string> = {
  'edit-pdf': 'Add text, notes and highlights.',
  'merge-pdf': 'Bring your documents together.',
  'split-pdf': 'Keep just the pages you need.',
  'compress-pdf': 'Optimize your PDF file.',
  'sign-pdf': 'Add your signature in seconds.',
  'image-to-pdf': 'Turn your images into a PDF.',
  'invoice-generator': 'Create an invoice with a live preview.',
  'compress-images': 'Shrink images to your target size.',
  'signature-generator': 'Create a transparent signature PNG.',
  'pdf-to-jpg': 'Save PDF pages as JPG images.',
  'organize-pdf': 'Reorder, rotate or remove pages.',
  'enhance-image': 'Adjust brightness, color and sharpness.',
};

export function ToolGrid({
  tools,
  className = '',
  cardClassName = '',
}: {
  tools: ToolSummary[];
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={`${s.grid} ${className}`}>
      {tools.map((tool) => (
        <Link
          prefetch={false}
          href={`/${tool.slug}`}
          className={`tool-card ${s.card} ${cardClassName}`}
          key={tool.slug}
        >
          <span className={`tool-icon ${s.icon}`}>
            <ToolIcon name={tool.icon} size={25} />
          </span>
          <span className={s.copy}>
            <strong>{tool.name}</strong>
            <span>{descriptions[tool.slug] || tool.short}</span>
            {!tool.available && <small>Coming soon</small>}
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
