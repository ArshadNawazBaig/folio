import { processPdf, inspectPdf } from '../lib/pdf-engine';
import type { PdfInput, PdfOperation, PdfOptions } from '../lib/types';
self.onmessage = async (
  event: MessageEvent<{
    id: string;
    operation: PdfOperation | 'inspect';
    inputs: PdfInput[];
    options: PdfOptions;
  }>,
) => {
  const { id, operation, inputs, options } = event.data;
  try {
    const result =
      operation === 'inspect'
        ? await inspectPdf(inputs[0].bytes)
        : await processPdf(operation, inputs, options);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'The document could not be processed.',
    });
  }
};
