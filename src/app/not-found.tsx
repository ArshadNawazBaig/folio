import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="not-found">
        <span className="eyebrow">404 / A PAGE OUT OF PLACE</span>
        <h1>
          Let’s find
          <br />
          <em>a better starting point.</em>
        </h1>
        <p>This page doesn’t seem to be here. Your next document tool is just around the corner.</p>
        <Link href="/tools" className="button primary">
          Explore the tools <ArrowRight size={17} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
