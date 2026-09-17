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
          <Link prefetch={false} href="/edit-pdf">
            Edit PDF
          </Link>
          <Link prefetch={false} href="/edit-pdf-text">
            PDF text editor
          </Link>
          <Link prefetch={false} href="/merge-pdf">
            Merge PDF
          </Link>
          <Link prefetch={false} href="/compress-pdf">
            Compress PDF
          </Link>
          <Link prefetch={false} href="/sign-pdf">
            Fill & sign
          </Link>
        </div>
        <div>
          <h3>Find your format</h3>
          <Link prefetch={false} href="/pdf-to-jpg">
            PDF to JPG
          </Link>
          <Link prefetch={false} href="/pdf-to-png">
            PDF to PNG
          </Link>
          <Link prefetch={false} href="/image-to-pdf">
            Image to PDF
          </Link>
          <Link prefetch={false} href="/pdf-to-text">
            PDF to text
          </Link>
        </div>
        <div>
          <h3>Around Folio</h3>
          <Link href="/tools">
            Explore all tools <ArrowUpRight size={13} />
          </Link>
          <Link href="/guides">Helpful guides</Link>
          <Link href="/blog">The Folio blog</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/support">Contact support</Link>
          <Link href="/about">About Folio</Link>
          <Link href="/privacy">Your privacy</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/security">Report a security issue</Link>
          <a href="/feed.xml">Subscribe via RSS</a>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Folio. Thoughtfully put together.</span>
        <span>Designed for the details.</span>
      </div>
    </footer>
  );
}
