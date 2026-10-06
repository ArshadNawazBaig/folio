'use client';

import dynamic from 'next/dynamic';
import type { Tool } from '@/lib/tools';

// Keep the initial upload controls server-rendered while loading only this tool's code.
const ToolProcessor = dynamic(() => import('./tool-processor').then((m) => m.ToolProcessor));
const ProTextEditor = dynamic(() => import('./pro-text-editor').then((m) => m.ProTextEditor));
const ProtectPdf = dynamic(() => import('./protect-pdf').then((m) => m.ProtectPdf));
const ImageWorkbench = dynamic(() => import('./image-workbench').then((m) => m.ImageWorkbench));
const QrWorkbench = dynamic(() => import('./qr-workbench').then((m) => m.QrWorkbench));
const ShortLinks = dynamic(() => import('./short-links').then((m) => m.ShortLinks));
const InvoiceLauncher = dynamic(() => import('./invoice-launcher').then((m) => m.InvoiceLauncher));
const SignatureWorkbench = dynamic(() =>
  import('./signature-dialog').then((m) => m.SignatureWorkbench),
);

export function ToolInteractive({ tool }: { tool: Tool }) {
  if (tool.processor === 'invoice') return <InvoiceLauncher />;
  if (tool.processor === 'signature') return <SignatureWorkbench />;
  if (tool.processor === 'image') return <ImageWorkbench tool={tool} />;
  if (tool.processor === 'qr') return <QrWorkbench />;
  if (tool.processor === 'shortener') return <ShortLinks />;
  if (tool.slug === 'edit-pdf-text') return <ProTextEditor />;
  if (tool.slug === 'protect-pdf') return <ProtectPdf />;
  return <ToolProcessor tool={tool} />;
}
