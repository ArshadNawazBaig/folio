import assert from 'node:assert/strict';

// Minimal PostgREST filter grammar used by the real route harness. Keep quoted
// values intact so ownership predicates and unusual email addresses are tested.
export function restFilters(
  search: URLSearchParams,
  params: unknown[],
  ident: (value: string) => string,
) {
  function split(value: string) {
    const parts: string[] = [];
    let start = 0,
      depth = 0,
      quoted = false,
      escaped = false;
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (quoted && c === '\\') {
        escaped = true;
        continue;
      }
      if (c === '"') quoted = !quoted;
      if (!quoted) {
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) {
          parts.push(value.slice(start, i));
          start = i + 1;
        }
      }
    }
    assert.equal(depth, 0);
    assert.equal(quoted, false);
    return [...parts, value.slice(start)];
  }
  function condition(key: string, raw: string): string {
    if (key === 'or' || key === 'and') {
      assert.ok(raw.startsWith('(') && raw.endsWith(')'));
      return `(${split(raw.slice(1, -1))
        .map(term)
        .join(key === 'or' ? ' or ' : ' and ')})`;
    }
    if (raw === 'is.null') return `${ident(key)} is null`;
    if (raw === 'not.is.null') return `${ident(key)} is not null`;
    const pos = raw.indexOf('.'),
      op = raw.slice(0, pos),
      value = raw.slice(pos + 1);
    const operators: Record<string, string> = {
      eq: '=',
      neq: '<>',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      ilike: 'ilike',
    };
    assert.ok(operators[op], `Unsupported test filter ${op}`);
    return `${ident(key)} ${operators[op]} $${params.push(value.startsWith('"') ? JSON.parse(value) : value)}`;
  }
  function term(value: string): string {
    if (value.startsWith('or(')) return condition('or', value.slice(2));
    if (value.startsWith('and(')) return condition('and', value.slice(3));
    const pos = value.indexOf('.');
    return condition(value.slice(0, pos), value.slice(pos + 1));
  }
  return [...search]
    .filter(([key]) => !['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key))
    .map(([key, value]) => condition(key, value));
}
