import Link from 'next/link';
import { BrandWordmark } from '@/components/brand-mark';
import { QuietLegal } from '@/components/brand-legal';
import { LangSwitch } from '@/components/auth-premium/lang-switch';
import { AUTH_COPY } from '@/lib/auth-copy';
import { readAuthLang } from '@/lib/auth-lang.server';
import { NUVORA_BRAND } from '@/lib/brand';
import { NotFoundHint } from './not-found-hint';
import './not-found.css';

/** Any unknown public address, including a tablet with a wrong Clocker key. Direction B (Nov 8, 2026): the teal band
 * with the title and "Error 404", then one reading card and the way back.
 * Review B4 (Nov 10, 2026): in the sign-in language with its switch (NV-316), and the one-line legal footer the other
 * public pages use instead of the old lockup (NV-206). */
export default async function NotFound() {
  const lang = await readAuthLang();
  const t = AUTH_COPY[lang], words = t.notFound;
  return <main className="nf-page" lang={lang}>
    <header className="nf-band">
      <div className="nf-top"><span className="nf-wordmark"><BrandWordmark/></span><LangSwitch lang={lang} label={t.langLabel} quiet/></div>
      {/* Direction B (Jose, Nov 8, 2026): the decorative "404" goes; "Page not found · Error 404" stays. */}
      <h1 id="not-found-title">{words.title}</h1>
      <p className="nf-eyebrow">{words.eyebrow}</p>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className="not-found-text">{words.body}</p>
        <NotFoundHint/>
        <Link href="/login" className="nf-cta">{words.cta}</Link>
      </div>
      <footer className="nf-foot"><small>{NUVORA_BRAND.poweredBy}</small><QuietLegal lang={lang}/></footer>
    </section>
  </main>;
}
