import Link from 'next/link';
import { AuthBrand } from '@/components/auth-brand';
import { BrandWordmark } from '@/components/brand-mark';
import { BrandLegal } from '@/components/brand-legal';
import { NUVORA_BRAND } from '@/lib/brand';
import { AUTH_COPY } from '@/lib/auth-copy';
import { readAuthLang } from '@/lib/auth-lang.server';
import { ClockerHint } from '../../not-found-hint';
import '../../not-found.css';
import styles from './not-found.module.css';

/** A tablet whose Clocker link is wrong (an unknown or inactive key). The same Direction B 404 as every unknown address,
 * but the time clock hint leads with who can fix it, and signing in is a quiet text link: a personal sign-in doesn't belong
 * on a shared tablet (Nov 10 review, NV-174). Other unknown addresses keep the app's own 404.
 * Review F2 (NV-316): in the sign-in language, the hint led by a tablet glyph. */
export default async function ClockerNotFound() {
  const lang = await readAuthLang(), words = AUTH_COPY[lang].notFound;
  return <main className="nf-page" lang={lang}>
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      <h1 id="not-found-title">{words.title}</h1>
      <p className="nf-eyebrow">{words.eyebrow}</p>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <ClockerHint className={styles.lead} title={words.hintTitle} body={words.clockerHintBody} />
        <p className={styles.other}>{words.notClocker} <Link href="/login" className={styles.signIn}>{words.cta}</Link></p>
      </div>
      <footer className="nf-foot"><AuthBrand/><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
    </section>
  </main>;
}
