import { pageMetadata } from '@/lib/seo';
import { HomePageContent } from '@/components/home-page-content';
const title = 'Free Online PDF Tools — Edit, Merge, Compress & Sign';
const description =
  'Add text, sign, merge, split and convert images to PDF online. Annotation downloads are free; original-text changes require a paid plan.';
export const metadata = pageMetadata(title, description, '/', true, {
  title: 'Folio — Free Online PDF Tools',
  description: 'Free tools to add text, sign, merge and split PDFs with Folio.',
  twitterDescription:
    'Add text, sign, merge, split and convert images to PDF with Folio in your browser. Download annotations free without a Folio watermark. Original-text changes require a paid plan.',
});
// Public copy and provider availability are shared across visitors. Regenerate
// periodically; account state and the maintenance gate remain request-specific.
export const revalidate = 300;
export default function Home() {
  return <HomePageContent />;
}
