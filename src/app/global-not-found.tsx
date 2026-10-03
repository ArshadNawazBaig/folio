import { RootDocument } from '@/components/root-document';
import { NotFoundPage } from '@/components/not-found-page';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
export const metadata = {
  title: 'Page not found | Folio',
  robots: { index: false, follow: false },
};
export default function GlobalNotFound() {
  return (
    <RootDocument>
      <Header />
      <NotFoundPage />
      <Footer />
    </RootDocument>
  );
}
