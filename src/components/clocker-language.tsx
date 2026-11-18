'use client';

import {createContext,useContext,useSyncExternalStore,type ReactNode} from 'react';
import {clockerHasText,clockerText,type ClockerLocale} from './clocker-copy';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker.module.css';

/* The Clocker speaks one complete language at a time, English or Spanish (Puerto Rico), chosen on the tablet and
 * remembered per tablet. Direction B (Nov 8, 2026) is the only presentation; the earlier Spanish-second-line labels
 * went with the retired Signature look. In English the button names are the kiosk's sentence-case labels (Nov 14
 * inspection, BR-10: "Clock in", "Clock out", "Try again"); in Spanish every visible and accessible phrase comes from
 * clocker-copy.ts. */

/** Switches the kiosk between English and Spanish. `className` replaces the kiosk's own pill on a page that is not inside
 * the kiosk frame (the paused page and the Clocker's not-found page draw it on their band). */
export function ClockerLanguageToggle({className}:{className?:string}={}) {
  const {locale}=useClockerPresentation();
  return <button type="button" className={className??styles.lang} data-clocker-language="" aria-label={locale==='en'?'Switch language to Spanish':'Cambiar idioma a inglés'} onClick={()=>changeLocale(locale==='en'?'es':'en')}>
    <ClockerIcon name="globe" size={18}/><span lang={locale==='en'?'es':'en'}>{locale==='en'?'Español':'English'}</span>
  </button>;
}

const LOCALE_KEY='nevora.clocker.locale';
let memoryLocale:ClockerLocale|null=null;
const localeListeners=new Set<()=>void>();
function localeSnapshot(fallback:ClockerLocale):ClockerLocale{if(memoryLocale)return memoryLocale;try{const v=window.localStorage.getItem(LOCALE_KEY);if(v==='en'||v==='es')return v;}catch{}return memoryLocale??fallback;}
function localeSubscribe(listener:()=>void){localeListeners.add(listener);const storage=(event:StorageEvent)=>{if(event.key===LOCALE_KEY){memoryLocale=null;listener();}};window.addEventListener('storage',storage);return()=>{localeListeners.delete(listener);window.removeEventListener('storage',storage);};}
function changeLocale(locale:ClockerLocale){memoryLocale=locale;try{window.localStorage.setItem(LOCALE_KEY,locale);}catch{/* Keep the choice in memory when storage is blocked. */}localeListeners.forEach(listener=>listener());}
/** The browser's own first language, for a kiosk screen that was not served with one (the error screen). */
function browserLocale():ClockerLocale{try{return (navigator.languages?.[0]??navigator.language??'').toLowerCase().startsWith('es')?'es':'en';}catch{return 'en';}}
const Presentation=createContext({locale:'en' as ClockerLocale});
/* Where the tablet's language comes from (Phase 6, RA-13), in order: the choice made on this tablet (kept in this
 * browser's storage under nevora.clocker.locale, so it stays for the next person); else the language the page was served
 * in (`initialLocale`: the kiosk page, the paused page and the not-found page pass the sign-in language, which follows the
 * browser's Accept-Language on a first visit, so a Spanish tablet starts in Spanish); else the browser's first language. */
export function ClockerPresentation({initialLocale,children}:{initialLocale?:ClockerLocale;children:ReactNode}){
 const locale=useSyncExternalStore(localeSubscribe,()=>localeSnapshot(initialLocale??browserLocale()),()=>initialLocale??'en');
 return <Presentation.Provider value={{locale}}>{children}</Presentation.Provider>;
}
export function useClockerPresentation(){return useContext(Presentation);}
export function useClockerCopy(){const {locale}=useClockerPresentation();return (key:string,params?:Record<string,string|number>)=>clockerText(locale,key,params);}
/** A message that may come from the server: in Spanish, a sentence the kiosk has no line for stays in English and is
 * marked as English for screen readers (Nov 10 review, NV-045). */
export function ClockerText({text}:{text:string}){
 const {locale}=useClockerPresentation();
 return clockerHasText(locale,text)?<>{clockerText(locale,text)}</>:<span lang="en">{text}</span>;
}
/** The locale for Intl date and time formatting. */
export function useClockerIntlLocale(){return useClockerPresentation().locale==='es'?'es-PR':'en-US';}
