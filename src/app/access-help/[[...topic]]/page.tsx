import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import {notFound} from 'next/navigation';
import {QuietAuthShell} from '@/components/auth-premium/auth-shell';
import {mobileAccessEnabled,mobileSupportEnabled} from '@/components/mobile-access/config.server';
import {AccessHelpView} from '@/components/mobile-access/help-view';
import {AUTH_COPY} from '@/lib/auth-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import {SUPPORT_EMAIL} from '@/lib/legal/policies';
import '@/components/quiet/quiet.css';
import '@/app/login/auth-premium.css';
import '@/app/login/auth-signature.css';

export const dynamic='force-dynamic';
const topics=['','id','email','owner','owner-other','owner-contact','support','invitation','missing','link','registered-email','activated'];
const origins={login:'/login',recover:'/forgot-access',reset:'/reset-access',activate:'/activate'} as const;
export default async function AccessHelpPage({params,searchParams}:{params:Promise<{topic?:string[]}>;searchParams:Promise<{from?:string}>}) {
 if(!mobileAccessEnabled())notFound();
 const [{topic:parts=[]},query,lang]=await Promise.all([params,searchParams,readAuthLang()]);
 const topic=parts.join('/');if(!topics.includes(topic)||parts.length>1)notFound();
 const supportEmail=mobileSupportEnabled()?SUPPORT_EMAIL:null;
 if(['support','owner-contact'].includes(topic)&&!supportEmail)notFound();
 const from=query.from&&Object.hasOwn(origins,query.from)?query.from:'login';
 const parent=topic?`/access-help?from=${from}`:origins[from as keyof typeof origins];
 return <QuietAuthShell helpFrom={from as keyof typeof origins} lang={lang} t={AUTH_COPY[lang]} back={parent} backLabel={lang==='es'?'Volver':'Back'}><AccessHelpView topic={topic} lang={lang} from={from} supportEmail={supportEmail}/></QuietAuthShell>;
}

export const generateMetadata=()=>mobileAccessMetadata("help");
