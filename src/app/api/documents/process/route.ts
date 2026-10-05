// Keep a clear response for stale clients. These paid document services were removed.
export async function POST(_request: Request) {
  return Response.json(
    { error: 'PDF translation and Office conversion are no longer available.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}
