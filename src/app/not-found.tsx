import Link from 'next/link';
import { AuthBrand } from '@/components/auth-brand';
import { BrandWordmark } from '@/components/brand-mark';
import { BrandLegal } from '@/components/brand-legal';
import { NUVORA_BRAND } from '@/lib/brand';
import { NotFoundHint } from './not-found-hint';
import './not-found.css';

/** Any unknown public address, including a tablet with a wrong Clocker key. Direction B (Nov 8, 2026): the teal band
 * with the title and "Error 404", then one reading card and the way back. */
export default function NotFound() {
  return <main className="nf-page">
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      {/* Direction B (Jose, Nov 8, 2026): the decorative "404" goes; "Page not found · Error 404" stays. */}
      <h1 id="not-found-title">Page not found</h1>
      <p className="nf-eyebrow">Error 404</p>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className="not-found-text">This link doesn’t go anywhere in NEVORA. Check the address, or sign in to find what you need.</p>
        <NotFoundHint/>
        <Link href="/login" className="nf-cta">Go to sign in</Link>
      </div>
      <footer className="nf-foot"><AuthBrand/><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
    </section>
  </main>;
}
