import { requireUser, adminDb } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { assertServiceAvailable } from '@/lib/server/platform';
import {
  invoiceBody,
  invoiceHeaders,
  invoiceDbError,
  invoiceId,
  saveInvoice,
} from '@/lib/server/invoices';

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      id = invoiceId((await context.params).id);
    const { data, error } = await adminDb()
      .from('invoices')
      .select('id,document,summary,revision,created_at,updated_at')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle();
    invoiceDbError(error);
    if (!data) throw new ApiError(404, 'This invoice was not found in your account.');
    return Response.json({ invoice: data }, { headers: invoiceHeaders });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    await assertServiceAvailable();
    const user = await requireUser(request),
      id = invoiceId((await context.params).id);
    const body = await invoiceBody(request, true);
    return Response.json(
      {
        invoice: await saveInvoice(
          user.id,
          body.document,
          id,
          'revision' in body && typeof body.revision === 'number' ? body.revision : null,
        ),
      },
      { headers: invoiceHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      id = invoiceId((await context.params).id);
    const { error } = await adminDb().rpc('delete_invoice', { actor: user.id, invoice_id: id });
    invoiceDbError(error);
    return new Response(null, { status: 204, headers: invoiceHeaders });
  } catch (error) {
    return apiError(error);
  }
}
