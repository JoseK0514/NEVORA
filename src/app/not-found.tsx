import Link from 'next/link';
import { AuthBrand } from '@/components/auth-brand';
import { BrandLegal } from '@/components/brand-legal';
import { NUVORA_BRAND } from '@/lib/brand';
import { NotFoundHint } from './not-found-hint';
import './not-found.css';

/** Any unknown public address, including a tablet with a wrong Clocker key. Signature style (phase 4): the deep band
 * with a large 404, then a soft white sheet with one card and the way back. */
export default function NotFound() {
  return <main className="nf-page">
    <header className="nf-band">
      <svg className="nf-mark" viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z" fill="#164B48"/><path d="M146 330 L180 266 L214 330 Z" fill="#35B6EC"/></svg>
      <p className="nf-eyebrow">Error 404</p>
      <b className="nf-404" aria-hidden="true">404</b>
      <h1 id="not-found-title">Page not found</h1>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className="not-found-text">This link doesn’t go anywhere in NEVORA. Check the address, or sign in to find what you need.</p>
        <NotFoundHint/>
      </div>
      <Link href="/login" className="nf-cta">Go to sign in</Link>
      <footer className="nf-foot"><AuthBrand/><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
    </section>
  </main>;
}
