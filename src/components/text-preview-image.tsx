'use client';
import { useLayoutEffect, useRef } from 'react';
import type { InteractiveTextImage } from '@/lib/pro-types';

function PixelTile({
  data,
  width,
  height,
  pageHeight,
  top,
  partial,
}: {
  data: Uint8Array;
  width: number;
  height: number;
  pageHeight: number;
  top: number;
  partial?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    // A view over transferred memory, not another copy of the page's pixels.
    const rgba = new Uint8ClampedArray(
      data.buffer as ArrayBuffer,
      data.byteOffset,
      data.byteLength,
    );
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
  }, [data, width, height]);
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      aria-hidden="true"
      style={{
        display: 'block',
        width: '100%',
        height: `${(height / pageHeight) * 100}%`,
        ...(partial ? { position: 'absolute', top: `${(top / pageHeight) * 100}%`, left: 0 } : {}),
      }}
    />
  );
}

export function TextPreviewImage({
  image,
  className,
  alt,
  width,
  height,
}: {
  image: InteractiveTextImage;
  className: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  if ('pixels' in image)
    return (
      <div
        className={className}
        data-partial={image.partial || undefined}
        role="img"
        aria-label={alt}
        style={{ width, height }}
      >
        {image.pixels.map((tile) => (
          <PixelTile
            key={tile.top}
            data={tile.data}
            width={image.width}
            height={tile.height}
            pageHeight={image.height}
            top={tile.top}
            partial={image.partial}
          />
        ))}
      </div>
    );
  if (!image.partial && !image.tiles?.length)
    return (
      <img
        className={className}
        src={`data:image/png;base64,${image.preview}`}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
      />
    );
  return (
    <div
      className={className}
      data-partial={image.partial || undefined}
      role="img"
      aria-label={alt}
      style={{ width, height }}
    >
      {image.tiles?.map((tile) => (
        <img
          key={tile.top}
          src={`data:image/png;base64,${tile.preview}`}
          alt=""
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: `${(tile.height / image.height) * 100}%`,
            ...(image.partial
              ? { position: 'absolute', top: `${(tile.top / image.height) * 100}%`, left: 0 }
              : {}),
          }}
        />
      ))}
    </div>
  );
}
