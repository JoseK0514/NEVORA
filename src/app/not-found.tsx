import Link from 'next/link';
import { BrandWordmark } from '@/components/brand-mark';
import { SignedOutFooter } from '@/components/auth-premium/signed-out-footer';
import { LangSwitch } from '@/components/auth-premium/lang-switch';
import { AUTH_COPY } from '@/lib/auth-copy';
import { readAuthLang } from '@/lib/auth-lang.server';
import { NotFoundHint } from './not-found-hint';
import type { Metadata } from 'next';
import './not-found.css';

/** Review 30 (D37): the 404's document title is in the page's language ("Página no encontrada · NEVORA"); it was the
 * English product name on both. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await readAuthLang();
  return { title: `${AUTH_COPY[lang].notFound.title} · NEVORA` };
}

/** Any unknown public address, including a tablet with a wrong Clocker key. Direction B (Nov 8, 2026): the teal band
 * with the title and "Error 404", then one reading card and the way back.
 * Review B4 (Nov 10, 2026): in the sign-in language with its switch (NV-316), and the one-line legal footer the other
 * public pages use instead of the old lockup (NV-206).
 * Phase 5 (Nov 17, 2026, PB-035): the card is a 560px state card, centred, and the band's wordmark, switch and title
 * line up with it. A signed-in unknown address never reaches this page: src/app/app/not-found.tsx keeps the app's
 * shell and draws the kit's own 560px state card (BStateScreen), so the two cases share the card's width, not markup. */
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
        <NotFoundHint title={words.hintTitle} body={words.hintBody}/>
        <Link href="/login" className="nf-cta">{words.cta}</Link>
      </div>
      {/* Phase 5 (PB-035): one VELANI line. Phase 8: the footer every signed-out page shares. */}
      <footer className="nf-foot"><SignedOutFooter lang={lang}/></footer>
    </section>
  </main>;
}
