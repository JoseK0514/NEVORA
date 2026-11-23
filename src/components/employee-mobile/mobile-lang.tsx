'use client';
/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): the language the Employee phone screens speak. It is the
 * person's portal language (Profile choice, then the sign-in nv-lang cookie, then the browser's, then English), read
 * once by the app layout and handed down by PortalLangProvider. MobileLangProvider overrides it for a subtree, which the
 * render tests use to draw a screen in Spanish. Words live in employee-mobile-copy.ts; dates and times in
 * mobile-format.ts. */
import {createContext,useContext} from 'react';
import type {MobileLang} from './mobile-format';

export type {MobileLang} from './mobile-format';

const Override=createContext<MobileLang|null>(null);
/** Draws its children in the given language, whatever the portal language is. */
export const MobileLangProvider=Override.Provider;

/** The language for the Employee phone screens: an override when one is set, else the person's portal language. */
export function useMobileLang():MobileLang{
 const own=useContext(Override);
 return own??portalLang();
}

/* Until the shell's PortalLangProvider lands (src/lib/i18n/portal-lang.tsx), the portal language reads as English. */
function portalLang():MobileLang{return 'en';}

/** One screen's words in the person's language: `const t=useMobileCopy(hoursCopy)`. */
export function useMobileCopy<T>(table:{en:T;es:T}):T{return table[useMobileLang()];}
