import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Logo } from './logo';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top container">
        <div className="footer-brand">
          <Logo />
          <p>
            A little less paperwork.
            <br />A little more possibility.
          </p>
          <span className="privacy-tag">
            <ShieldCheck size={15} />
            Made for your peace of mind.
          </span>
        </div>
        <div>
          <h3>Make it yours</h3>
          <Link href="/edit-pdf">Edit PDF</Link>
          <Link href="/edit-pdf-text">PDF text editor</Link>
          <Link href="/merge-pdf">Merge PDF</Link>
          <Link href="/compress-pdf">Compress PDF</Link>
          <Link href="/sign-pdf">Fill & sign</Link>
        </div>
        <div>
          <h3>Find your format</h3>
          <Link href="/pdf-to-jpg">PDF to JPG</Link>
          <Link href="/pdf-to-png">PDF to PNG</Link>
          <Link href="/image-to-pdf">Image to PDF</Link>
          <Link href="/pdf-to-text">PDF to text</Link>
        </div>
        <div>
          <h3>Around Folio</h3>
          <Link href="/tools">
            Explore all tools <ArrowUpRight size={13} />
          </Link>
          <Link href="/guides">Helpful guides</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/support">Contact support</Link>
          <Link href="/about">About Folio</Link>
          <Link href="/privacy">Your privacy</Link>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Folio. Thoughtfully put together.</span>
        <span>Designed for the details.</span>
      </div>
    </footer>
  );
}
