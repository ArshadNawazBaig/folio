import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { adminDb } from './auth';
import { ApiError, boundedBody } from './http';
import { invoiceSaveSchema, invoiceUpdateSchema, invoiceTotals, type Invoice } from '../invoice';
import { renderInvoicePdf } from '../invoice-pdf';
import { invoiceDesign } from '../invoice-designs';

export const invoiceHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};
export function invoiceId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError(400, 'Choose a valid invoice.');
  return id;
}
export function invoiceDbError(error: { message: string } | null) {
  if (!error) return;
  const errors: Record<string, [number, string]> = {
    invoice_missing: [404, 'This invoice was not found in your account.'],
    invoice_conflict: [
      409,
      'This invoice changed in another tab. Download a draft backup, then reopen the saved invoice before updating it.',
    ],
    invoice_pro_required: [402, 'Saving invoices requires active Folio Pro access.'],
    invoice_limit: [
      409,
      'Your library has 200 invoices. Delete an older invoice before saving another.',
    ],
    suspended: [403, 'This account is suspended. Contact support.'],
    deletion_in_progress: [403, 'This account is being deleted.'],
  };
  const match = Object.entries(errors).find(([key]) => error.message.includes(key));
  if (match) throw new ApiError(...match[1]);
  throw new ApiError(503, 'Your invoice library is unavailable. Please try again.');
}
export async function invoiceBody(request: Request, update = false) {
  const parsed = (update ? invoiceUpdateSchema : invoiceSaveSchema).safeParse(
    JSON.parse((await boundedBody(request, 600000)).toString()),
  );
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
  return parsed.data;
}
export function invoiceSummary(invoice: Invoice) {
  const totals = invoiceTotals(invoice);
  return {
    number: invoice.number,
    customer: invoice.to.name,
    currency: invoice.currency,
    total: totals.total,
    balance: totals.balance,
    issued: invoice.issued,
    due: invoice.due,
  };
}
export async function saveInvoice(
  actor: string,
  document: Invoice,
  id: string | null = null,
  revision: number | null = null,
) {
  const { data, error } = await adminDb().rpc('save_invoice', {
    actor,
    invoice_id: id,
    expected_revision: revision,
    invoice_document: document,
    invoice_summary: invoiceSummary(document),
  });
  invoiceDbError(error);
  return data;
}
export async function premiumInvoicePdf(document: Invoice) {
  const [regular, bold] = await Promise.all(
    ['Regular', 'Bold'].map((weight) =>
      readFile(path.join(process.cwd(), `public/fonts/pdf/LiberationSans-${weight}.ttf`)),
    ),
  );
  const heading = invoiceDesign(document.template).serif
    ? await readFile(path.join(process.cwd(), 'public/fonts/pdf/LiberationSerif-Regular.ttf'))
    : undefined;
  let qr: string | undefined;
  if (document.paymentQr && document.paymentUrl) {
    const QRCode = await import('qrcode');
    qr = await QRCode.toDataURL(document.paymentUrl, {
      width: 256,
      margin: 4,
      errorCorrectionLevel: 'M',
    });
  }
  return renderInvoicePdf(
    document,
    { regular, bold, heading },
    {
      qr,
    },
  );
}
