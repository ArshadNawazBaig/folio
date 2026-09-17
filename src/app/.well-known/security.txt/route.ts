import { siteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export function GET() {
  // Review the reporting route before renewing this date; do not perpetually extend it at runtime.
  return new Response(
    `Contact: ${siteUrl}/support
Expires: 2027-09-01T00:00:00Z
Preferred-Languages: en
Canonical: ${siteUrl}/.well-known/security.txt
Policy: ${siteUrl}/security
`,
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
