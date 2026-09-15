import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { withImageResolution } from '../src/lib/image-resolution';
import { jpegOrientation } from '../src/lib/image-tools';

test('PNG and JPG print metadata matches the selected DPI without changing pixels', async () => {
  for (const format of ['png', 'jpeg'] as const) {
    const original = await sharp({
      create: { width: 180, height: 90, channels: 3, background: '#ce8132' },
    })
      .toFormat(format)
      .toBuffer();
    const raw = await sharp(original).raw().toBuffer();
    let blob = new Blob([Uint8Array.from(original)], { type: `image/${format}` });
    for (const dpi of [108, 144, 216, 300]) {
      blob = await withImageResolution(blob, dpi);
      const bytes = Buffer.from(await blob.arrayBuffer());
      assert.equal((await sharp(bytes).metadata()).density, dpi);
      assert.deepEqual(await sharp(bytes).raw().toBuffer(), raw);
    }
  }
});
test('JPEG orientation identifies mirrored and rotated photos and tolerates damaged metadata', async () => {
  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const bytes = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#abcabc' },
    })
      .withMetadata({ orientation })
      .jpeg()
      .toBuffer();
    assert.equal(jpegOrientation(bytes), orientation);
    assert.equal(jpegOrientation(bytes.subarray(0, 32)), 1);
  }
  assert.equal(jpegOrientation(new Uint8Array([1, 2, 3])), 1);
});
