import { requireUser } from '@/lib/server/auth';
import { accessFor } from '@/lib/server/billing';
import { apiError } from '@/lib/server/http';
export async function GET(request: Request) {
  try {
    return Response.json(await accessFor((await requireUser(request)).id));
  } catch (error) {
    return apiError(error);
  }
}
