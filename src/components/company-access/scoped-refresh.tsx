'use client';
import {createContext,useContext} from 'react';
import {BButton} from '../owner-b/b-kit';

/** The access frame's fresh check, handed to the state it is showing, so "Refresh current view" sits inside that state's
 * card with its other actions (Phase 2, package D). Outside a frame there is nothing to refresh and nothing is drawn. */
export const ScopedRefreshContext=createContext<(()=>void)|null>(null);

export function ScopedRefreshButton(){
 const refresh=useContext(ScopedRefreshContext);
 return refresh?<BButton kind="quiet" onClick={refresh}>Refresh current view</BButton>:null;
}
