'use client';
import {useSyncExternalStore} from 'react';
import {switchTo} from '@/components/auth-premium/lang-switch';
import type {AuthLang} from '@/lib/auth-copy';
import styles from './recovery.module.css';

const subscribe=()=>()=>{};
/** The sign-in pages' language switch on the billing frame: one pill naming the other language. It stores the choice
 * and reloads through sign-in's own `switchTo`, so the server renders the page in it. The central billing page keeps
 * its session in memory and cannot reload; it passes its own two-option control to the frame. */
export function ReloadLanguage({lang,label}:{lang:AuthLang;label:string}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const next:AuthLang=lang==='es'?'en':'es',name=next==='es'?'Español':'English';
 return <button type="button" className={styles.lang} lang={next} disabled={!ready} aria-label={`${label}: ${name}`} onClick={()=>switchTo(next)}>{name}</button>;
}
