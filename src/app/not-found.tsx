import Link from 'next/link';
import { AuthBrand } from '@/components/auth-brand';
import { BrandLegal } from '@/components/brand-legal';
import { NUVORA_BRAND } from '@/lib/brand';
import { NotFoundHint } from './not-found-hint';
import './login/login.css';
import './login/auth-refinement.css';
import './not-found.css';

/** Any unknown public address, including a tablet with a wrong Clocker key. */
export default function NotFound() {
  return <main className="auth-page employee-login-page auth-refinement-page not-found-page"><div className="employee-login-shell">
    <header className="employee-login-brand"><AuthBrand/></header>
    <section className="auth-card employee-login-card not-found-card" aria-labelledby="not-found-title">
      <div className="employee-login-heading"><h1 id="not-found-title">Page not found</h1></div>
      <p className="not-found-text">This link doesn’t go anywhere in NEVORA. Check the address, or sign in to find what you need.</p>
      <NotFoundHint/>
      <Link href="/login" className="button primary employee-login-submit"><span>Go to sign in</span></Link>
    </section>
    <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
  </div></main>;
}
