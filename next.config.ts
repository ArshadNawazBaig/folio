import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.FOLIO_TEST_OUTPUT === 'auth' ? '.next-auth-tests' : '.next',
  poweredByHeader: false,
  reactStrictMode: true,
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
    '/api/{pro,documents}/*': [
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
      './node_modules/@pdf-lib/fontkit/**/*',
      './node_modules/pdf-lib/**/*',
      './node_modules/@pdf-lib/standard-fonts/**/*',
      './node_modules/@pdf-lib/upng/**/*',
      './node_modules/pako/**/*',
      './node_modules/tslib/**/*',
      './node_modules/@embedpdf/pdfium/**/*',
      './node_modules/sharp/**/*',
      './node_modules/@img/sharp-*/**/*',
      './node_modules/@img/colour/**/*',
      './node_modules/detect-libc/**/*',
      './node_modules/semver/**/*',
    ],
  },
  async redirects() {
    return [
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/apple-touch-icon.png',
        permanent: true,
      },
      { source: '/pdf-editor', destination: '/edit-pdf', permanent: true },
      { source: '/translate-pdf-page', destination: '/translate-pdf', permanent: true },
      { source: '/pdf-forms', destination: '/forms', permanent: true },
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
      ].map((source) => ({
        source,
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      })),
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      {
        source: '/pdfium/:file.wasm.gz',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/:path((?!fonts(?:/|$)).*)',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};
export default config;
