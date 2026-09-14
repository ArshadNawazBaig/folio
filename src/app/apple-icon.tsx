import { ImageResponse } from 'next/og';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f6f2',
        fontSize: 130,
        fontWeight: 900,
        color: '#202522',
      }}
    >
      f<span style={{ color: '#c44934' }}>.</span>
    </div>,
    size,
  );
}
