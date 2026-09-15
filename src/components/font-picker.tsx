'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Loader2, Search } from 'lucide-react';
import { Pagination } from './pagination';
import { PAGE_SIZE } from '@/lib/pagination.mjs';
import { Dropdown } from './dropdown';
import { loadBrowserDocumentFont } from '@/lib/document-font-client';
import { documentFontStyle, parseDocumentFont } from '@/lib/document-fonts.mjs';
import { replacementFonts, type TextBlock, type TextFont } from '@/lib/pro-types';

type Family = { id: string; family: string; weights: number[]; styles: string[] };
type Results = { fonts: Family[]; total: number; count: number; page: number };
type Item = { value: string; label: string; family?: Family };
const weightNames: Record<number, string> = {
  100: 'Thin',
  200: 'Extra light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra bold',
  900: 'Black',
};
const metadata = new Map<string, Family>();

export function FontPicker({
  value,
  onChange,
  original,
  label = 'Text font',
  disabled = false,
}: {
  value: TextFont;
  onChange: (font: TextFont) => void;
  original?: TextBlock;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [highlight, setHighlight] = useState<Item | null>(null);
  const [preview, setPreview] = useState<string>('');
  const sequence = useRef(0);
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);
  const parsed = parseDocumentFont(value);
  const selectedId = parsed?.id;
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  useEffect(() => {
    if (!selectedId) {
      setFamily(null);
      return;
    }
    const cached = metadata.get(selectedId);
    if (cached) {
      setFamily(cached);
      return;
    }
    const abort = new AbortController();
    void fetch(`/api/fonts?family=${encodeURIComponent(selectedId)}`, {
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Font details could not be loaded.');
        const next: Family = await response.json();
        metadata.set(next.id, next);
        setFamily(next);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('Font details could not be loaded. Try again.');
      });
    return () => abort.abort();
  }, [selectedId, retry]);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setBusy(true);
    setResults(null);
    setError('');
    const timer = setTimeout(() => {
      // Include the page size in the cache key when the shared default changes.
      void fetch(`/api/fonts?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`, {
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          const next: Results = await response.json();
          next.fonts.forEach((font) => metadata.set(font.id, font));
          setResults(next);
        })
        .catch(() => {
          if (!abort.signal.aborted) setError('The font library could not be loaded. Try again.');
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [open, query, page, retry, pageSize]);

  function reference(font: Family): TextFont {
    const wanted =
      parsed?.weight ||
      (value === 'original' ? original?.fontWeight : /Bold/.test(value) ? 700 : 400) ||
      400;
    const weight = [...font.weights].sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0];
    const italic =
      parsed?.style === 'italic' ||
      (value === 'original' ? original?.fontItalic : /Italic|Oblique/.test(value));
    const style = font.styles.includes(italic ? 'italic' : 'normal')
      ? italic
        ? 'italic'
        : 'normal'
      : font.styles[0];
    return `google:${font.id}:${weight}:${style}` as TextFont;
  }
  const items: Item[] = useMemo(() => {
    const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());
    return [
      ...(original && matches(`Original ${original.font}`)
        ? [{ value: 'original', label: `Original · ${original.font.replace(/^[A-Z]{6}\+/, '')}` }]
        : []),
      ...(busy ? [] : results?.fonts || []).map((font) => ({
        value: font.id,
        label: font.family,
        family: font,
      })),
      ...replacementFonts
        .filter((font) => matches(font.replace('-', ' ')))
        .map((font) => ({ value: font, label: font.replace('-', ' ') })),
    ];
  }, [original, query, busy, results]);
  const collection = useMemo(
    () =>
      Combobox.createItems(items, {
        getValue: (item) => item.value,
        getLabel: (item) => item.label,
      }),
    [items],
  );
  const highlightedReference = highlight?.family
    ? reference(highlight.family)
    : highlight?.value || '';
  useEffect(() => {
    setPreview('');
    if (!open || !highlightedReference) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void loadBrowserDocumentFont(highlightedReference).then(
        () => {
          if (!cancelled) setPreview(highlightedReference);
        },
        () => {},
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, highlightedReference]);
  async function apply(next: TextFont) {
    const request = ++sequence.current,
      previous = value;
    setApplying(true);
    setError('');
    try {
      await loadBrowserDocumentFont(next);
      if (request === sequence.current && latestValue.current === previous) onChange(next);
    } catch {
      if (request === sequence.current)
        setError(
          'This font could not be loaded. Your current font is unchanged. Try another font or retry.',
        );
    } finally {
      if (request === sequence.current) setApplying(false);
    }
  }
  const currentLabel = parsed
    ? family?.family || parsed.id.replaceAll('-', ' ')
    : value === 'original'
      ? `Original · ${original?.font.replace(/^[A-Z]{6}\+/, '') || 'PDF font'}`
      : value.replace('-', ' ');
  return (
    <div className="font-picker">
      <Combobox.Root
        items={collection}
        filter={null}
        value={selectedId || value}
        inputValue={query}
        onInputValueChange={(next) => {
          setQuery(next);
          setPage(0);
        }}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery('');
            setPage(0);
            setHighlight(null);
          }
        }}
        onItemHighlighted={(next) =>
          setHighlight(items.find((item) => item.value === next) || null)
        }
        onValueChange={(next) => {
          const item = items.find((item) => item.value === next);
          if (item) void apply(item.family ? reference(item.family) : (item.value as TextFont));
        }}
        disabled={disabled || applying}
      >
        <Combobox.Label className="dropdown-label">{label}</Combobox.Label>
        <Combobox.Trigger className="dropdown-trigger">
          <span className="dropdown-value">{currentLabel}</span>
          {applying ? <Loader2 size={16} className="spin" /> : <ChevronDown size={16} />}
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            className="dropdown-positioner"
            sideOffset={7}
            collisionPadding={12}
            align="start"
          >
            <Combobox.Popup className="dropdown-popup font-picker-popup" aria-label="Font library">
              <div className="dropdown-search">
                <Search size={16} aria-hidden="true" />
                <Combobox.Input
                  className="dropdown-search-input"
                  placeholder="Search fonts…"
                  aria-label="Search fonts"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="font-library-caption">
                {query ? 'Search results' : 'Popular fonts first'}
                {results && <span>{results.count.toLocaleString()} families</span>}
              </div>
              {busy && (
                <div className="font-library-loading" role="status" aria-label="Loading fonts">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="skeleton" />
                  ))}
                </div>
              )}
              {!busy && (
                <Combobox.List className="dropdown-list font-library-list" aria-label="Fonts">
                  {(item: Item) => (
                    <Combobox.Item className="dropdown-option" key={item.value} value={item.value}>
                      <span className="dropdown-option-copy">
                        <span>{item.label}</span>
                        {item.family && (
                          <span className="dropdown-description">
                            {item.family.weights.length} weight
                            {item.family.weights.length === 1 ? '' : 's'}
                            {item.family.styles.includes('italic') ? ' · Italic available' : ''}
                          </span>
                        )}
                      </span>
                      <Combobox.ItemIndicator className="dropdown-check">
                        <Check size={15} />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              )}
              {!busy && !items.length && (
                <p className="dropdown-empty">No fonts found. Try a different name.</p>
              )}
              {highlight?.family && (
                <div
                  className="font-library-preview"
                  style={preview ? (documentFontStyle(preview) as CSSProperties) : undefined}
                  aria-label="Font preview"
                >
                  {preview ? 'The quick brown fox · 123' : 'Loading preview…'}
                </div>
              )}
              {results && (
                <Pagination
                  page={page + 1}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(0);
                  }}
                  total={results.total}
                  onChange={(next) => setPage(next - 1)}
                  disabled={busy}
                  label="Fonts pagination"
                />
              )}
              {open && error && (
                <div className="font-picker-error" role="alert">
                  {error}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    Retry font library
                  </button>
                </div>
              )}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {parsed && family?.id === parsed.id && (
        <div className="font-style-fields">
          <Dropdown
            label="Font weight"
            value={String(parsed.weight)}
            options={family.weights.map((weight) => ({
              value: String(weight),
              label: weightNames[weight] || String(weight),
            }))}
            onValueChange={(weight) =>
              void apply(`google:${parsed.id}:${Number(weight)}:${parsed.style}` as TextFont)
            }
            disabled={disabled || applying}
          />
          <Dropdown
            label="Font style"
            value={parsed.style}
            options={family.styles.map((style) => ({
              value: style,
              label: style === 'italic' ? 'Italic' : 'Normal',
            }))}
            onValueChange={(style) =>
              void apply(`google:${parsed.id}:${parsed.weight}:${style}` as TextFont)
            }
            disabled={disabled || applying}
          />
        </div>
      )}
      {applying && <small role="status">Loading font…</small>}
      {!open && error && (
        <p className="font-picker-error" role="alert">
          {error}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setRetry((n) => n + 1);
              setOpen(true);
            }}
          >
            Retry font library
          </button>
        </p>
      )}
    </div>
  );
}
