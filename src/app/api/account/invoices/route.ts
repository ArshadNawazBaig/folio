import { requireUser, adminDb } from '@/lib/server/auth';
import { apiError } from '@/lib/server/http';
import { assertServiceAvailable } from '@/lib/server/platform';
import { invoiceBody, invoiceHeaders, invoiceDbError, saveInvoice } from '@/lib/server/invoices';
import { readPage, requestedPage } from '@/lib/server/pagination';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const page = requestedPage(new URL(request.url).searchParams);
    const query = adminDb()
      .from('invoices')
      .select('id,summary,revision,created_at,updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('id');
    const { data, error, count } = await readPage(query, page, 10);
    invoiceDbError(error);
    return Response.json({ invoices: data, total: count, page }, { headers: invoiceHeaders });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    await assertServiceAvailable();
    const user = await requireUser(request);
    const { document } = await invoiceBody(request);
    return Response.json(
      { invoice: await saveInvoice(user.id, document) },
      { status: 201, headers: invoiceHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
