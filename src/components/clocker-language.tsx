'use client';

import {createContext,useContext,useSyncExternalStore,type ReactNode} from 'react';
import {clockerText,type ClockerLocale} from './clocker-copy';
import { ClockerIcon } from './clocker-icon';

/** Spanish secondary labels for the shared Clocker, beside the unchanged
 * English. English stays the accessible name and the text scripts press;
 * Spanish is a second line marked lang="es". Each tablet remembers whether
 * to show it (on by default). Legal and payroll text stays English. */
export const CLOCKER_ES = {
  'Clock In': 'Marcar entrada', 'Start Break': 'Iniciar descanso', 'End Break': 'Terminar descanso', 'Clock Out': 'Marcar salida',
  'Confirm Clock Out': 'Confirmar salida', 'Keep Working': 'Seguir trabajando', 'Done': 'Listo', 'Back': 'Volver', 'Continue': 'Continuar',
  'Clocked In': 'En turno', 'On Break': 'En descanso', 'Off Clock': 'Fuera de turno',
  'Clock In Recorded': 'Entrada registrada', 'Break Start Recorded': 'Inicio de descanso registrado',
  'Break End Recorded': 'Fin de descanso registrado', 'Clock Out Recorded': 'Salida registrada',
  'Enter your PIN': 'Ingresa tu PIN', 'Choose a Break': 'Elige un descanso', 'Clock Out?': '¿Marcar salida?',
} as const;
export type ClockerPhrase = keyof typeof CLOCKER_ES;

const KEY = 'nevora:clocker-spanish';
const listeners = new Set<() => void>();
function read(): boolean { try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; } }
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => { if (event.key === KEY) listener(); };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
export function useClockerSpanish() { const on=useSyncExternalStore(subscribe,read,()=>true);return !useClockerPresentation().v2&&on; }
function setSpanish(on: boolean) { try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked: stays for this page */ } listeners.forEach(listener => listener()); }

/** The Spanish line for a phrase. Hidden from assistive tech inside buttons,
 * whose English aria-label is the name; announced (in Spanish) elsewhere. */
export function Es({ phrase, inButton = false }: { phrase: ClockerPhrase; inButton?: boolean }) {
  return <span className="clocker-es" lang="es" aria-hidden={inButton || undefined}>{CLOCKER_ES[phrase]}</span>;
}

/** Shows or hides the Spanish second lines. Named by its visible text; aria-pressed carries the state. */
export function ClockerLanguageToggle() {
  const on = useClockerSpanish(),presentation=useClockerPresentation();
  if(presentation.v2)return <button type="button" className="clocker-language-toggle" aria-label={presentation.locale==='en'?'Switch language to Spanish':'Cambiar idioma a inglés'} onClick={()=>changeLocale(presentation.locale==='en'?'es':'en')}><ClockerIcon name="globe" size={18}/><span lang={presentation.locale==='en'?'es':'en'}>{presentation.locale==='en'?'Español':'English'}</span></button>;
  return <button type="button" className="clocker-language-toggle" aria-pressed={on} onClick={() => setSpanish(!on)}>
    <ClockerIcon name="globe" size={18}/><span lang="es">Español</span><b aria-hidden="true">{on ? 'On' : 'Off'}</b>
  </button>;
}

const LOCALE_KEY='nevora.clocker.locale';
let memoryLocale:ClockerLocale|null=null;
const localeListeners=new Set<()=>void>();
function localeSnapshot(fallback:ClockerLocale):ClockerLocale{if(memoryLocale)return memoryLocale;try{const v=window.localStorage.getItem(LOCALE_KEY);if(v==='en'||v==='es')return v;}catch{}return memoryLocale??fallback;}
function localeSubscribe(listener:()=>void){localeListeners.add(listener);const storage=(event:StorageEvent)=>{if(event.key===LOCALE_KEY){memoryLocale=null;listener();}};window.addEventListener('storage',storage);return()=>{localeListeners.delete(listener);window.removeEventListener('storage',storage);};}
function changeLocale(locale:ClockerLocale){memoryLocale=locale;try{window.localStorage.setItem(LOCALE_KEY,locale);}catch{/* Keep the choice in memory when storage is blocked. */}localeListeners.forEach(listener=>listener());}
const Presentation=createContext({v2:false,locale:'en' as ClockerLocale});
export function ClockerPresentation({v2=false,initialLocale='en',children}:{v2?:boolean;initialLocale?:ClockerLocale;children:ReactNode}){
 const locale=useSyncExternalStore(localeSubscribe,()=>localeSnapshot(initialLocale),()=>initialLocale);
 return <Presentation.Provider value={{v2,locale}}>{children}</Presentation.Provider>;
}
export function useClockerPresentation(){return useContext(Presentation);}
export function useClockerCopy(){const {v2,locale}=useClockerPresentation();return (key:string,params?:Record<string,string|number>)=>clockerText(v2?locale:'en',key,params);}
