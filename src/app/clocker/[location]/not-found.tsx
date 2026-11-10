import Link from 'next/link';
import { AuthBrand } from '@/components/auth-brand';
import { BrandWordmark } from '@/components/brand-mark';
import { BrandLegal } from '@/components/brand-legal';
import { NUVORA_BRAND } from '@/lib/brand';
import '../../not-found.css';
import styles from './not-found.module.css';

/** A tablet whose Clocker link is wrong (an unknown or inactive key). The same Direction B 404 as every unknown address,
 * but the time clock hint leads with who can fix it, and signing in is a quiet text link: a personal sign-in doesn't belong
 * on a shared tablet (Nov 10 review, NV-174). Other unknown addresses keep the app's own 404. */
export default function ClockerNotFound() {
  return <main className="nf-page">
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      <h1 id="not-found-title">Page not found</h1>
      <p className="nf-eyebrow">Error 404</p>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className={`not-found-hint ${styles.lead}`}><strong>Is this a time clock tablet?</strong> Ask a manager to set up this tablet again. They can get the current link in Settings, under Clocker tablets.</p>
        <p className={styles.other}>Not a time clock? <Link href="/login" className={styles.signIn}>Go to sign in</Link></p>
      </div>
      <footer className="nf-foot"><AuthBrand/><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal/></footer>
    </section>
  </main>;
}
