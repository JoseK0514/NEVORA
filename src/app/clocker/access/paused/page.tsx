import type {Metadata} from 'next';
import {clockerReturnPath} from '@/lib/commerce/recovery-routes';
import {notFound} from 'next/navigation';
import {commerceEnabled} from '@/lib/commerce/access';
import {readAuthLang} from '@/lib/auth-lang.server';
import {ClockerPaused} from '@/components/clocker-paused';
export const metadata:Metadata={title:'Clocker access',robots:{index:false,follow:false},referrer:'no-referrer'};
export const dynamic='force-dynamic';
export default async function PausedClockerPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(!commerceEnabled())notFound();
 const params=await searchParams,from=clockerReturnPath(params.from),lang=await readAuthLang(),unavailable=params.reason==='billing_status_unavailable';
 // The tablet's saved language leads (the kiosk's choice); the sign-in language is only the starting point.
 return <ClockerPaused from={from} unavailable={unavailable} initialLocale={lang}/>;
}
