import { requireUser } from '@/lib/server/auth';
import { consumeProRequest } from '@/lib/server/billing';
import { apiError, ApiError } from '@/lib/server/http';
import { assertServiceAvailable } from '@/lib/server/platform';
import { invoiceBody, invoiceHeaders, premiumInvoicePdf } from '@/lib/server/invoices';
import { invoiceIssues } from '@/lib/invoice';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    const user = await requireUser(request);
    const { document } = await invoiceBody(request);
    const issues = invoiceIssues(document);
    if (issues.length) throw new ApiError(400, issues[0]);
    await consumeProRequest(user.id);
    let result;
    try {
      result = await premiumInvoicePdf(document);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : 'The invoice could not be exported.',
      );
    }
    return new Response(new Uint8Array(result.bytes), {
      headers: {
        ...invoiceHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
