import {logout} from '@/app/login/actions';
import {BrandWordmark} from '@/components/brand-mark';
import {NUVORA_BRAND} from '@/lib/brand';
import '@/app/not-found.css';
import type {PortalLang} from '@/lib/i18n/portal-lang';
import {NATIVE_SHELL_COPY} from './native-shell-copy';
import './unsupported-role.css';

/** Native release qualification only; account permissions remain unchanged. Direction B (Nov 9, 2026): the public pages'
 * teal band with the wordmark and the title, one reading card with the two lines, and Sign out as its pill. */
/** `lang`: the person's language; the app layout (shell) can pass the language it already reads. */
export function UnsupportedNativeRole({lang = 'en'}: {lang?: PortalLang} = {}) {
  const t = NATIVE_SHELL_COPY[lang];
  return <main className="nf-page nu-page" lang={lang === 'es' ? 'es' : undefined}>
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      <h1 id="native-unsupported-title">{t.useBrowser}</h1>
    </header>
    <section className="nf-sheet" aria-labelledby="native-unsupported-title">
      <div className="nf-card">
        {/* Review B2 (NV-214): says who the app is for in plain words, so a shift lead isn't left thinking "I am an employee".
          Letting Leads into the app (Jose, Nov 10) and an "Open in your browser" button need the app and server (codex-B2.md). */}
        <p className="not-found-text">{t.appIsFor}</p>
        <p className="not-found-text">{t.continueBrowser}</p>
        <form action={logout}><button type="submit" className="nf-cta nu-signout">{t.signOut}</button></form>
      </div>
      {/* Review B6 (NV-321): the band carries the wordmark; the footer is only the operator line. */}
      <footer className="nf-foot"><small>{NUVORA_BRAND.poweredBy}</small></footer>
    </section>
  </main>;
}
