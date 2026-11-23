'use client';
import {createContext,useContext} from 'react';
import {BButton} from '../owner-b/b-kit';
import {accessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

/** The access frame's fresh check, handed to the state it is showing, so "Refresh current view" sits inside that state's
 * card with its other actions (Phase 2, package D). Outside a frame there is nothing to refresh and nothing is drawn. */
export const ScopedRefreshContext=createContext<(()=>void)|null>(null);

export function ScopedRefreshButton({lang:langProp}:{lang?:AccessLang}={}){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const refresh=useContext(ScopedRefreshContext);
 return refresh?<BButton kind="quiet" onClick={refresh}>{accessCopy(lang).frame.refresh}</BButton>:null;
}
