import 'server-only';
import type {Metadata} from 'next';
import {readAuthLang} from '@/lib/auth-lang.server';
import {mobileAccessEnabled} from './config.server';
import {MOBILE_ACCESS_COPY} from './copy';

export async function mobileAccessMetadata(page:'signin'|'recover'|'reset'|'activate'|'help'|'welcome'):Promise<Metadata>{
 if(!mobileAccessEnabled())return {};
 const t=MOBILE_ACCESS_COPY[await readAuthLang()];
 const title={signin:t.signIn,recover:t.forgotTitle,reset:t.resetTitle,activate:t.activateTitle,help:t.helpTitle,welcome:t.welcome}[page].replace(/\.$/,'');
 return {title:{absolute:`${title} · NEVORA`}};
}
