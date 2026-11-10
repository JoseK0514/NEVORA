import 'server-only';
import type {Metadata} from 'next';
import {readAuthLang} from '@/lib/auth-lang.server';
import {AUTH_COPY} from '@/lib/auth-copy';
import {mobileAccessEnabled} from './config.server';
import {MOBILE_ACCESS_COPY} from './copy';

type AuthPage='signin'|'recover'|'reset'|'activate'|'help'|'welcome';

export async function mobileAccessMetadata(page:AuthPage):Promise<Metadata>{
 const lang=await readAuthLang();
 // Review F2 (NV-022): with Mobile Access off the sign-in pages still name themselves (their own H1 words), so the tab
 // and screen readers never fall back to "NEVORA Workforce". Help and Welcome are 404 without Mobile Access.
 if(!mobileAccessEnabled()){
  const a=AUTH_COPY[lang];
  const fallback:Record<AuthPage,string>={signin:a.signIn,recover:a.forgotTitle,reset:a.quiet.resetTitle,activate:a.activateTitle,help:a.signIn,welcome:a.signIn};
  return {title:{absolute:`${fallback[page].replace(/\.$/,'')} · NEVORA`}};
 }
 const t=MOBILE_ACCESS_COPY[lang];
 const title={signin:t.signIn,recover:t.forgotTitle,reset:t.resetTitle,activate:t.activateTitle,help:t.helpTitle,welcome:t.welcome}[page].replace(/\.$/,'');
 return {title:{absolute:`${title} · NEVORA`}};
}
