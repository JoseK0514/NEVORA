'use client';
import {useRouter} from 'next/navigation';
import {useSyncExternalStore,useTransition} from 'react';
import {AUTH_LANG_COOKIE,type AuthLang} from '@/lib/auth-copy';
import {useAccessJourney} from './journey';
const subscribe=()=>()=>{};
export function MobileLanguageSwitch({lang}:{lang:AuthLang}) {
 const router=useRouter(),journey=useAccessJourney(),[pending,startTransition]=useTransition();
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false),next=lang==='en'?'es':'en';
 return <button type="button" className="ma-language" lang={next} disabled={!ready||pending} aria-label={next==='es'?'Cambiar a español':'Switch to English'} onClick={()=>{
  const input=document.querySelector<HTMLInputElement>('#login-employee-id,#recovery-employee-id');
  if(input)journey.setDraftId(input.value);
  document.cookie=`${AUTH_LANG_COOKIE}=${next}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  startTransition(()=>router.refresh());
 }}>{next==='es'?'Español':'English'}</button>;
}

export function MobileSkipLink({label}:{label:string}) {
 return <a className="ma-skip" href="#access-content" onClick={event=>{event.preventDefault();const main=document.getElementById('access-content');main?.focus({preventScroll:true});main?.scrollIntoView({block:'start',behavior:'instant'});}}>{label}</a>;
}
