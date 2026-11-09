'use client';

import {createContext,useContext,useSyncExternalStore,type ReactNode} from 'react';
import {clockerText,type ClockerLocale} from './clocker-copy';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker.module.css';

/* The Clocker speaks one complete language at a time, English or Spanish (Puerto Rico), chosen on the tablet and
 * remembered per tablet. Direction B (Nov 8, 2026) is the only presentation; the earlier Spanish-second-line labels
 * went with the retired Signature look. Button names stay the exact English the phase-c scripts press when English is
 * chosen; in Spanish every visible and accessible phrase comes from clocker-copy.ts. */

/** Switches the kiosk between English and Spanish. */
export function ClockerLanguageToggle() {
  const {locale}=useClockerPresentation();
  return <button type="button" className={styles.lang} aria-label={locale==='en'?'Switch language to Spanish':'Cambiar idioma a inglés'} onClick={()=>changeLocale(locale==='en'?'es':'en')}>
    <ClockerIcon name="globe" size={18}/><span lang={locale==='en'?'es':'en'}>{locale==='en'?'Español':'English'}</span>
  </button>;
}

const LOCALE_KEY='nevora.clocker.locale';
let memoryLocale:ClockerLocale|null=null;
const localeListeners=new Set<()=>void>();
function localeSnapshot(fallback:ClockerLocale):ClockerLocale{if(memoryLocale)return memoryLocale;try{const v=window.localStorage.getItem(LOCALE_KEY);if(v==='en'||v==='es')return v;}catch{}return memoryLocale??fallback;}
function localeSubscribe(listener:()=>void){localeListeners.add(listener);const storage=(event:StorageEvent)=>{if(event.key===LOCALE_KEY){memoryLocale=null;listener();}};window.addEventListener('storage',storage);return()=>{localeListeners.delete(listener);window.removeEventListener('storage',storage);};}
function changeLocale(locale:ClockerLocale){memoryLocale=locale;try{window.localStorage.setItem(LOCALE_KEY,locale);}catch{/* Keep the choice in memory when storage is blocked. */}localeListeners.forEach(listener=>listener());}
const Presentation=createContext({locale:'en' as ClockerLocale});
export function ClockerPresentation({initialLocale='en',children}:{initialLocale?:ClockerLocale;children:ReactNode}){
 const locale=useSyncExternalStore(localeSubscribe,()=>localeSnapshot(initialLocale),()=>initialLocale);
 return <Presentation.Provider value={{locale}}>{children}</Presentation.Provider>;
}
export function useClockerPresentation(){return useContext(Presentation);}
export function useClockerCopy(){const {locale}=useClockerPresentation();return (key:string,params?:Record<string,string|number>)=>clockerText(locale,key,params);}
/** The locale for Intl date and time formatting. */
export function useClockerIntlLocale(){return useClockerPresentation().locale==='es'?'es-PR':'en-US';}
