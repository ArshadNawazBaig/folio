import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.FOLIO_TEST_OUTPUT === 'auth' ? '.next-auth-tests' : '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/{pro,documents}/*': [
      './scripts/pro-pdf-worker.mjs',
      './scripts/pdf-text-engine.mjs',
      './src/lib/pdf-text-size.mjs',
      './src/lib/pdf-text-position.mjs',
      './src/lib/pdf-original-fonts.mjs',
      './public/fonts/pdf/*',
      './node_modules/@pdf-lib/fontkit/**/*',
      './node_modules/@embedpdf/pdfium/**/*',
      './node_modules/pngjs/**/*',
    ],
  },
  async redirects() {
    return [
      { source: '/pdf-editor', destination: '/edit-pdf', permanent: true },
      { source: '/translate-pdf-page', destination: '/translate-pdf', permanent: true },
      { source: '/pdf-forms', destination: '/forms', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...[
        '/workspace',
        '/documents',
        '/account',
        '/dashboard/:path*',
        '/admin/:path*',
        '/support',
        '/maintenance',
        '/auth/:path*',
        '/api/:path*',
      ].map((source) => ({
        source,
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      })),
    ];
  },
};
export default config;
