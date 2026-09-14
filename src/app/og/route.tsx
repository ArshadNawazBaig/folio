import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const title = (
    request.nextUrl.searchParams.get('title') || 'Your documents. Beautifully handled.'
  ).slice(0, 100);
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '64px 76px',
        background: '#f7f6f2',
        color: '#202522',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 54, fontWeight: 700 }}>
        folio<span style={{ color: '#c44934' }}>.</span>
      </div>
      <div
        style={{
          display: 'flex',
          maxWidth: 960,
          fontSize: title.length > 65 ? 62 : 76,
          lineHeight: 1.1,
          letterSpacing: '-3px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #d9dcd3',
          paddingTop: 26,
          fontSize: 22,
        }}
      >
        <span>Less paperwork. More possibility.</span>
        <span style={{ color: '#c44934' }}>PDF tools, thoughtfully put together. ↗</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400', 'X-Robots-Tag': 'noindex' },
    },
  );
}
