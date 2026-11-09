import {logout} from '@/app/login/actions';
import {AuthBrand} from '@/components/auth-brand';
import {BrandWordmark} from '@/components/brand-mark';
import {NUVORA_BRAND} from '@/lib/brand';
import '@/app/not-found.css';
import './unsupported-role.css';

/** Native release qualification only; account permissions remain unchanged. Direction B (Nov 9, 2026): the public pages'
 * teal band with the wordmark and the title, one reading card with the two lines, and Sign out as its pill. */
export function UnsupportedNativeRole() {
  return <main className="nf-page nu-page">
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      <h1 id="native-unsupported-title">Use NEVORA in your web browser</h1>
    </header>
    <section className="nf-sheet" aria-labelledby="native-unsupported-title">
      <div className="nf-card">
        <p className="not-found-text">This version of the NEVORA app supports Employee and Owner accounts.</p>
        <p className="not-found-text">You can continue using your account in your web browser.</p>
        <form action={logout}><button type="submit" className="nf-cta nu-signout">Sign out</button></form>
      </div>
      <footer className="nf-foot"><AuthBrand/><small>{NUVORA_BRAND.poweredBy}</small></footer>
    </section>
  </main>;
}
