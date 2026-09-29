'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import s from './tool-search.module.css';

export function ToolSearch({
  value,
  onValueChange,
  name,
  clearHref,
}: {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  clearHref?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const clear = () => {
    onValueChange('');
    input.current?.focus();
  };
  return (
    <div className={s.search} role="search" aria-label="Find a tool">
      <Search size={18} aria-hidden="true" />
      <input
        ref={input}
        name={name}
        aria-label="Find a PDF tool"
        placeholder="Find a PDF tool"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        type="search"
        maxLength={120}
      />
      {value &&
        (clearHref ? (
          <Link
            className={s.clear}
            prefetch={false}
            href={clearHref}
            aria-label="Clear tool search"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              clear();
            }}
          >
            <X size={16} aria-hidden="true" />
          </Link>
        ) : (
          <button className={s.clear} type="button" aria-label="Clear tool search" onClick={clear}>
            <X size={16} aria-hidden="true" />
          </button>
        ))}
    </div>
  );
}
