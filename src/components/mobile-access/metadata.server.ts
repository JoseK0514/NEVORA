import 'server-only';
import type {Metadata} from 'next';
import {AUTH_COPY} from '@/lib/auth-copy';
import {readAuthLang} from '@/lib/auth-lang.server';
import {mobileAccessEnabled} from './config.server';
import {MOBILE_ACCESS_COPY} from './copy';

export async function mobileAccessMetadata(page:'signin'|'recover'|'reset'|'activate'|'help'|'welcome'):Promise<Metadata>{
 const lang=await readAuthLang();
 if(!mobileAccessEnabled()){
  if(page==='help'||page==='welcome')return {}; // These routes stay unavailable without Mobile Access.
  const t=AUTH_COPY[lang];
  return {title:{absolute:`${{signin:t.signIn,recover:t.forgotTitle,reset:t.resetTitle,activate:t.activateTitle}[page]} · NEVORA`}};
 }
 const t=MOBILE_ACCESS_COPY[lang];
 const title={signin:t.signIn,recover:t.forgotTitle,reset:t.resetTitle,activate:t.activateTitle,help:t.helpTitle,welcome:t.welcome}[page].replace(/\.$/,'');
 return {title:{absolute:`${title} · NEVORA`}};
}
