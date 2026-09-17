import Image from 'next/image';

/** Only public blog assets enter Next's image optimizer. Other approved CMS URLs retain their source. */
export function BlogCover({
  src,
  alt,
  hero = false,
  eager = false,
}: {
  src: string;
  alt: string;
  hero?: boolean;
  eager?: boolean;
}) {
  let optimized = false;
  try {
    const url = new URL(src);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.invalid');
    optimized =
      url.protocol === 'https:' &&
      ((url.origin === storage.origin &&
        url.pathname.startsWith('/storage/v1/object/public/folio-blog/')) ||
        url.hostname === 'images.unsplash.com');
  } catch {
    /* Use the original URL if it is outside the configured public image sources. */
  }
  const sizes = hero
    ? '(max-width: 768px) 100vw, 1120px'
    : '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 400px';
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={!optimized}
      loading={hero || eager ? 'eager' : 'lazy'}
      fetchPriority={hero || eager ? 'high' : undefined}
    />
  );
}
