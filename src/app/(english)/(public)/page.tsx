import { homeSearchCopy, pageMetadata } from '@/lib/seo';
import { HomePageContent } from '@/components/home-page-content';
const { title, description } = homeSearchCopy;
export const metadata = pageMetadata(title, description, '/', true, {
  title: 'Folio — Free Online PDF Tools',
  description: 'Free tools to add text, sign, merge and split PDFs with Folio.',
  twitterDescription:
    'Edit text, sign, merge, split and convert images to PDF with Folio. All available tools and downloads are free, with 1 GB of storage per account.',
});
// Public copy and provider availability are shared across visitors. Regenerate
// periodically; account state and the maintenance gate remain request-specific.
export const revalidate = 300;
export default function Home() {
  return <HomePageContent />;
}
