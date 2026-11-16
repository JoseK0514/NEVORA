import Link from 'next/link';
import type {ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {BrandWordmark} from '@/components/brand-mark';
import type {AuthLang} from '@/lib/auth-copy';
import {MobileLanguageSwitch,MobileSkipLink} from './language-switch';
import {MOBILE_ACCESS_COPY} from './copy';

export function MobileAccessHeader({lang,back,backLabel}:{lang:AuthLang;back?:string;backLabel?:string}) {
 const t=MOBILE_ACCESS_COPY[lang];
 return <div className="ma-only"><MobileSkipLink label={t.skipContent}/><header className="ma-header"><Link href="/welcome" aria-label="NEVORA" className="ma-brand"><BrandWordmark/></Link><MobileLanguageSwitch lang={lang}/></header>
  {/* Review B4 (NV-318): one back control, a bold caret and "Sign in" (or the help page's own "Back"). */}
  {back?<Link className="ma-back" href={back}><CaretLeftIcon size={16} weight="bold" aria-hidden="true"/>{backLabel??t.signIn}</Link>:null}</div>;
}

/** Phones show the form on a card, with "can't do this" help below it; both wrappers are unstyled on desktop and
 * absent when mobile Access is off, so the legacy markup is unchanged. */
export function AccessCard({mobile=true,children}:{mobile?:boolean;children:ReactNode}) {
 return mobile?<div className="ma-card">{children}</div>:<>{children}</>;
}
export function AccessOutside({mobile=true,children}:{mobile?:boolean;children:ReactNode}) {
 return mobile?<div className="ma-outside">{children}</div>:<>{children}</>;
}
