import { apiError } from '@/lib/server/http';
import { guestCookie, workspaceIdentity, workspaceResponse } from '@/lib/server/workspaces';

async function session(request: Request, create: boolean) {
  try {
    const identity = await workspaceIdentity(request, create);
    return workspaceResponse(
      request,
      { guest: !identity.actor && !!identity.guest },
      identity.cookie,
    );
  } catch (error) {
    const response = apiError(error);
    return workspaceResponse(request, await response.json(), null, response.status);
  }
}

// Reading the header's account state must not create or extend a guest session.
export async function GET(request: Request) {
  return session(request, false);
}

export async function POST(request: Request) {
  return session(request, true);
}

export async function DELETE(request: Request) {
  try {
    await workspaceIdentity(request);
    const response = workspaceResponse(request, { signedOut: true });
    response.cookies.set(guestCookie, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(request.url).protocol === 'https:',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    const response = apiError(error);
    return workspaceResponse(request, await response.json(), null, response.status);
  }
}
