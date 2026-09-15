// Canvas exports use a browser default DPI. Set the document's selected print resolution
// without decoding or recompressing pixels, so the physical print size matches the PDF.
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export async function withImageResolution(blob: Blob, dpi: number) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  dpi = Math.round(dpi);
  if (blob.type === 'image/jpeg') {
    for (let offset = 2; offset + 18 <= bytes.length;) {
      if (bytes[offset] !== 0xff || [0xda, 0xd9].includes(bytes[offset + 1])) break;
      const size = view.getUint16(offset + 2);
      if (size < 2 || offset + 2 + size > bytes.length) break;
      if (bytes[offset + 1] === 0xe0 && size >= 16 && view.getUint32(offset + 4) === 0x4a464946) {
        bytes[offset + 11] = 1;
        view.setUint16(offset + 12, dpi);
        view.setUint16(offset + 14, dpi);
        return new Blob([bytes], { type: blob.type });
      }
      offset += size + 2;
    }
    const header = new Uint8Array([255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0]);
    const metadata = new DataView(header.buffer);
    metadata.setUint16(12, dpi);
    metadata.setUint16(14, dpi);
    return new Blob([bytes.subarray(0, 2), header, bytes.subarray(2)], { type: blob.type });
  }
  if (blob.type === 'image/png') {
    const chunk = new Uint8Array(21);
    const metadata = new DataView(chunk.buffer);
    metadata.setUint32(0, 9);
    chunk.set([112, 72, 89, 115], 4); // pHYs
    const pixelsPerMeter = Math.round(dpi / 0.0254);
    metadata.setUint32(8, pixelsPerMeter);
    metadata.setUint32(12, pixelsPerMeter);
    chunk[16] = 1;
    metadata.setUint32(17, crc32(chunk.subarray(4, 17)));
    const parts: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 8)];
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const end = offset + view.getUint32(offset) + 12;
      if (end > bytes.length) throw new Error('The exported PNG is incomplete.');
      const type = view.getUint32(offset + 4);
      if (type !== 0x70485973) parts.push(bytes.subarray(offset, end));
      if (type === 0x49484452) parts.push(chunk); // After IHDR, before image data.
      offset = end;
    }
    return new Blob(parts, { type: blob.type });
  }
  return blob;
}
