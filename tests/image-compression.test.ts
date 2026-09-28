import test from 'node:test';
import assert from 'node:assert/strict';
import { compressToTarget, targetBytesFromKB } from '../src/lib/image-compression';

test('custom targets use decimal KB and reject ambiguous or unsafe values', () => {
  assert.equal(targetBytesFromKB('75'), 75000);
  assert.equal(targetBytesFromKB(' 10.125 '), 10125);
  assert.equal(targetBytesFromKB('1.001'), 1001);
  assert.equal(targetBytesFromKB('1000'), 1_000_000);
  for (const value of ['', '0', '-1', '1e3', '1,000', 'NaN', 'Infinity', '35001', '2.9999'])
    assert.throws(() => targetBytesFromKB(value));
});

test('quality search finds an output within the actual byte limit before resizing', async () => {
  const result = await compressToTarget({
    width: 1000,
    height: 500,
    targetBytes: 60000,
    formats: ['image/jpeg'],
    encode: async (_width, _height, type, quality) =>
      new Blob([new Uint8Array(Math.ceil(quality * 100000))], { type }),
  });
  assert.equal(result.width, 1000);
  assert.equal(result.height, 500);
  assert.ok(result.blob.size <= 60000 && result.blob.size > 57000);
});

test('PNG targets reduce dimensions proportionally instead of relying on a quality setting', async () => {
  const result = await compressToTarget({
    width: 1000,
    height: 500,
    targetBytes: 10000,
    formats: ['image/png'],
    encode: async (width, height, type, quality) => {
      assert.equal(quality, 1);
      return new Blob([new Uint8Array(width * height + 100)], { type });
    },
  });
  assert.ok(result.blob.size <= 10000);
  assert.ok(result.width < 1000 && Math.abs(result.width / result.height - 2) < 0.03);
});

test('Auto skips unsupported encoders and compares actual fitting outputs', async () => {
  const result = await compressToTarget({
    width: 100,
    height: 50,
    targetBytes: 10000,
    formats: ['image/webp', 'image/jpeg', 'image/png'],
    encode: async (_w, _h, type) =>
      type === 'image/webp'
        ? null
        : new Blob([new Uint8Array(type === 'image/png' ? 3000 : 4000)], { type }),
  });
  assert.equal(result.blob.type, 'image/png');
});

test('unreachable targets and unsupported formats fail without presenting an oversized result', async () => {
  await assert.rejects(
    compressToTarget({
      width: 2,
      height: 2,
      targetBytes: 1000,
      formats: ['image/jpeg'],
      encode: async () => new Blob([new Uint8Array(2000)], { type: 'image/jpeg' }),
    }),
    /could not be reached/,
  );
  await assert.rejects(
    compressToTarget({
      width: 2,
      height: 2,
      targetBytes: 1000,
      formats: ['image/webp'],
      encode: async () => null,
    }),
    /cannot export/,
  );
});
