import type { TextPreview } from '@/lib/pro-types';

export function TextPreviewImage({
  image,
  className,
  alt,
  width,
  height,
}: {
  image: TextPreview;
  className: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  if (!image.tiles?.length)
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
    <div className={className} role="img" aria-label={alt} style={{ width, height }}>
      {image.tiles.map((tile) => (
        <img
          key={tile.top}
          src={`data:image/png;base64,${tile.preview}`}
          alt=""
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: `${(tile.height / image.height) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
