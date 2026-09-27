import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Folio — PDF tools',
    short_name: 'Folio',
    description: 'Your documents. Beautifully handled.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f4',
    theme_color: '#191919',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
