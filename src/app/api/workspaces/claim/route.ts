import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { workspaceIdentity, workspaceResponse, workspaceError } from '@/lib/server/workspaces';
export async function POST(request: Request) {
  try {
    const identity = await workspaceIdentity(request);
    if (!identity.actor) throw new ApiError(401, 'Sign in to keep these files in your account.');
    if (!identity.guest) return workspaceResponse(request, { claimed: 0, remaining: 0 });
    const { data, error } = await adminDb().rpc('claim_guest_workspaces', {
      actor: identity.actor,
      guest: identity.guest,
    });
    workspaceError(error);
    return workspaceResponse(request, data);
  } catch (error) {
    return apiError(error);
  }
}
