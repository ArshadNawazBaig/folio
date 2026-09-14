import { processTextPdf } from './pdf-text-engine.mjs';
const chunks = [];
let size = 0;
try {
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 18 * 1024 * 1024) throw new Error('Request too large.');
    chunks.push(chunk);
  }
  const { bytes, job } = JSON.parse(Buffer.concat(chunks).toString());
  const result = await processTextPdf(Buffer.from(bytes, 'base64'), job);
  process.stdout.write(
    JSON.stringify(
      result instanceof Uint8Array ? { bytes: Buffer.from(result).toString('base64') } : result,
    ),
  );
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'This PDF could not be processed.',
    }),
  );
  process.exitCode = 1;
}
