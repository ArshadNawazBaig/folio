import { AdminBlog } from '@/components/blog/admin-blog';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Blog posts — super admin',
  'Create and manage the Folio journal.',
  '/admin/blog',
  false,
);
export default function Page() {
  return <AdminBlog />;
}
