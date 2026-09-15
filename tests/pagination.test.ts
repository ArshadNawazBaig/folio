import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_SIZE,
  PAGE_SIZES,
  normalizePageSize,
  databasePage,
  pageWindow,
} from '../src/lib/pagination.mjs';

test('shared pagination defaults to ten and handles empty, partial and removed last pages', () => {
  assert.equal(PAGE_SIZE, 10);
  assert.deepEqual(pageWindow(1, 0), { page: 1, pages: 1, start: 0, end: 0 });
  assert.deepEqual(pageWindow(2, 11), { page: 2, pages: 2, start: 11, end: 11 });
  assert.deepEqual(pageWindow(3, 10), { page: 1, pages: 1, start: 1, end: 10 });
});

test('ten-record API pages span legacy database batches without gaps or duplicate records', async () => {
  const rows = Array.from({ length: 63 }, (_, id) => ({ id }));
  const seen: number[] = [];
  for (let page = 1; page <= 7; page++) {
    const calls: number[] = [];
    const result = await databasePage(page, async (batch: number) => {
      calls.push(batch);
      return { rows: rows.slice((batch - 1) * 25, batch * 25), total: rows.length };
    });
    assert.equal(result.total, 63);
    assert.ok(calls.length <= 2, 'Only the necessary database batches are read');
    assert.ok(result.rows.length <= 10);
    seen.push(...result.rows.map((row: { id: number }) => row.id));
  }
  assert.deepEqual(
    seen,
    rows.map((row) => row.id),
  );
});

test('every selectable page size covers all database batches without gaps or duplicate records', async () => {
  const rows = Array.from({ length: 263 }, (_, id) => ({ id }));
  assert.deepEqual(PAGE_SIZES, [10, 25, 50, 100]);
  for (const size of PAGE_SIZES) {
    const seen: number[] = [];
    for (let page = 1; page <= Math.ceil(rows.length / size); page++) {
      let calls = 0;
      const result = await databasePage(
        page,
        async (batch: number) => {
          calls++;
          return { rows: rows.slice((batch - 1) * 25, batch * 25), total: rows.length };
        },
        size,
      );
      assert.equal(result.total, 263);
      assert.ok(result.rows.length <= size);
      assert.ok(calls <= Math.ceil(size / 25) + 1);
      seen.push(...result.rows.map((row: { id: number }) => row.id));
    }
    assert.deepEqual(
      seen,
      rows.map((row) => row.id),
    );
    assert.equal(pageWindow(999, 263, size).pages, Math.ceil(263 / size));
  }
  for (const invalid of [undefined, null, '', 'all', 0, 1.5, 11, 1000])
    assert.equal(normalizePageSize(invalid), 10);
});
