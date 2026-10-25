import Link from 'next/link';
import { BrandWordmark } from '@/components/brand-mark';
import { QuietLegal } from '@/components/brand-legal';
import { getSession } from '@/lib/auth/session';
import { NotFoundHint } from './not-found-hint';
import '@/components/quiet/quiet.css';
import '@/components/quiet/u1.css';

/** Any unknown public address, including a tablet with a wrong Clocker key (T-21, final pass Oct 25): the Quiet sign-in
 * page shape with "Page not found". Someone already signed in goes back to Home, never to sign in. */
export default async function NotFound() {
  const signedIn = await getSession().catch(() => null) !== null;
  return <main className="q-page q-auth u1-notfound" data-nv-page="" data-system-state="not-found">
    <div className="q-auth__col">
      <header className="q-auth__top"><span className="q-auth__wordmark"><BrandWordmark /></span></header>
      <div className="q-hd q-auth__hd"><h1 id="not-found-title">Page not found</h1><p>The link may be old.</p></div>
      <NotFoundHint />
      <Link href={signedIn ? '/app' : '/login'} className="q-btn q-btn--sec">{signedIn ? 'Back to Home' : 'Go to sign in'}</Link>
    </div>
    <footer className="q-auth__foot"><QuietLegal /></footer>
  </main>;
}
