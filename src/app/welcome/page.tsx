import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import Link from 'next/link';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {mobileAccessEnabled} from '@/components/mobile-access/config.server';
import {MOBILE_ACCESS_COPY} from '@/components/mobile-access/copy';
import {QuietAuthShell} from '@/components/auth-premium/auth-shell';
import {AUTH_COPY} from '@/lib/auth-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import '@/components/quiet/quiet.css';
import '@/app/login/auth-premium.css';
import '@/app/login/auth-signature.css';

export const dynamic='force-dynamic';
export default async function WelcomePage(){
 if(!mobileAccessEnabled())notFound();
 const lang=await readAuthLang(),t=MOBILE_ACCESS_COPY[lang];
 // Mock 7 (review B4, NV-197): the illustration lives in the teal band on phones and tablets and in the brand panel on a
 // desktop (instead of the panel's product line, so one headline speaks); the card holds the slogan and the two ways in.
 const art=(sizes:string)=><Image sizes={sizes} src="/assets/illustrations/mobile-access-welcome.png" width={1536} height={1024} alt=""/>;
 return <QuietAuthShell lang={lang} t={AUTH_COPY[lang]} brandArt={art('440px')} hero={art('(max-width: 430px) calc(100vw - 32px), 360px')}><div className="ma-welcome"><div className="q-hd"><h1>{t.welcome}</h1><p>{t.welcomeSub}</p></div><div className="ma-actions"><Link className="q-btn" href="/login">{t.signIn}<ArrowRightIcon size={20} aria-hidden="true"/></Link><Link className="q-btn q-btn--sec" href="/activate">{t.activateAccount}</Link></div><p className="ma-note">{t.welcomeHelp}</p></div></QuietAuthShell>;
}

export const generateMetadata=()=>mobileAccessMetadata("welcome");
