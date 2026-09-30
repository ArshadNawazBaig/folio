import type { NextConfig } from 'next';
import { contentSecurityPolicy } from './src/lib/security-headers';

const config: NextConfig = {
  distDir:
    process.env.FOLIO_TEST_OUTPUT === 'auth'
      ? '.next-auth-tests'
      : process.env.FOLIO_TEST_OUTPUT === 'performance'
        ? '.next-performance'
        : '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep workspace-only CSS out of the public landing page's critical requests.
  experimental: {
    cssChunking: 'graph',
  },
  // Resolve public metadata in the head; late streamed listing metadata can survive article navigation.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              pathname: '/storage/v1/object/public/folio-blog/**',
            },
          ]
        : []),
    ],
  },
  outputFileTracingIncludes: {
    '/api/invoices/export': [
      './public/fonts/pdf/LiberationSans-Regular.ttf',
      './public/fonts/pdf/LiberationSans-Bold.ttf',
      './public/fonts/pdf/LiberationSerif-Regular.ttf',
    ],
    // Only these routes launch the isolated PDF worker. Returning an existing
    // document from /api/documents/export does not need the processing engine.
    '/api/{pro/{pdf,preview,demo},documents/{process,preview}}': [
      './scripts/pro-pdf-worker.mjs',
      './scripts/pdf-text-engine.mjs',
      './src/lib/pdf-text-engine.mjs',
      './src/lib/pdf-text-copy.mjs',
      './src/lib/pdf-text-objects.mjs',
      './src/lib/pdf-form-source.mjs',
      './src/lib/pdf-text-paint.mjs',
      './src/lib/pdf-text-clip.mjs',
      './src/lib/pdf-text-size.mjs',
      './src/lib/pdf-text-position.mjs',
      './src/lib/pdf-preview.mjs',
      './src/lib/pdf-original-fonts.mjs',
      './src/lib/document-fonts.mjs',
      './src/lib/document-font-registry.mjs',
      './src/lib/pagination.mjs',
      './src/lib/document-font-catalog.json',
      './src/lib/server/document-fonts.mjs',
      './public/fonts/pdf/*',
      // The worker imports Node entry points, not browser builds, source maps,
      // TypeScript declarations, or package development sources.
      './node_modules/@pdf-lib/fontkit/{package.json,LICENSE*,dist/fontkit.umd.js}',
      './node_modules/pdf-lib/{package.json,LICENSE*,cjs/**/*.js}',
      './node_modules/@pdf-lib/standard-fonts/{package.json,LICENSE*,lib/**/*.{js,json}}',
      './node_modules/@pdf-lib/upng/{package.json,LICENSE*,cjs/*.js}',
      './node_modules/pako/{package.json,LICENSE*,index.js,lib/**/*.js}',
      './node_modules/tslib/{package.json,LICENSE*,tslib.js}',
      './node_modules/@embedpdf/pdfium/{package.json,LICENSE*,dist/index.js,dist/pdfium.wasm}',
      './node_modules/sharp/**/*',
      './node_modules/@img/sharp-*/**/*',
      './node_modules/@img/colour/**/*',
      './node_modules/detect-libc/**/*',
      './node_modules/semver/**/*',
    ],
  },
  async redirects() {
    return [
      { source: '/security.txt', destination: '/.well-known/security.txt', permanent: true },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/apple-touch-icon.png',
        permanent: true,
      },
      { source: '/pdf-editor', destination: '/edit-pdf', permanent: true },
      { source: '/translate-pdf-page', destination: '/translate-pdf', permanent: true },
      { source: '/pdf-forms', destination: '/forms', permanent: true },
      {
        source: '/invoice-generator',
        has: [{ type: 'query', key: 'invoice', value: '(?<invoiceId>[0-9a-fA-F-]{36})' }],
        destination: '/invoice-editor?invoice=:invoiceId',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
        ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
        : []),
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy(process.env) },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...[
        '/workspace',
        '/invoice-editor',
        '/documents',
        '/account',
        '/dashboard/:path*',
        '/admin/:path*',
        '/support',
        '/maintenance',
        '/auth/:path*',
      ].map((source) => ({
        source,
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      })),
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      // Keep fictional practice documents accessible through the guides without
      // offering their sample contents as standalone search results.
      { source: '/samples/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
      {
        source: '/pdfium/:file.wasm.gz',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/:path((?!fonts(?:/|$)|(?:capabilities|site)$).*)',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};
export default config;
