import { BlogEditor } from '@/components/blog/blog-editor';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Post editor — Folio',
  'Write, preview, and publish your next post.',
  '/admin/blog',
  false,
);
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogEditor id={id} />;
}
