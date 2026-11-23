'use client';
import './clocker-pin-inventory.css';
import './clocker-owner-b.css';
import Link from 'next/link';
import {useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import {BAvatar,BCard,BFilters,BList,BNote,BRow,BState} from './owner-b/b-kit';
import {clockerOwnerCopy,type ClockerOwnerLang} from './clocker-owner-copy';

/* Clocker PINs (Phase 6): who has a PIN and who does not. Search and two tabs on the band (No PIN first, then PIN set; an
 * Inactive tab only when someone is inactive), then one row per person: their name, their position and location, and one
 * action (Set PIN is the tinted pill, Reset PIN the quiet one). A PIN is never shown here or anywhere after it is set.
 * Each action opens that person's Clocker PIN page, which checks the Owner's authority again. */
type Filter='none'|'set'|'inactive';
const inFilter=(p:OwnerPinStatus,filter:Filter)=>filter==='inactive'?!p.active:p.active&&(filter==='none'?!p.configured:p.configured);
export function ClockerPinInventory({statuses,details={},lang='en'}:{statuses:OwnerPinStatus[];
 /** "Barista · Condado" by employee ID; a person without one shows no detail line. */ details?:Record<string,string>;lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang];
 const count=(filter:Filter)=>statuses.filter(p=>inFilter(p,filter)).length;
 const filters:Filter[]=count('inactive')?['none','set','inactive']:['none','set'];
 const labels:Record<Filter,string>={none:t.filterNone,set:t.filterSet,inactive:t.filterInactive};
 // People without a PIN come first: that tab opens unless everyone already has one.
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<Filter>(()=>count('none')||!count('set')?'none':'set');
 const wanted=query.trim().toLocaleLowerCase();
 // People in name order, as on Team.
 const visible=statuses.filter(p=>inFilter(p,filter)&&`${p.firstName} ${p.lastName} ${p.employeeId} ${details[p.employeeId]??''}`.toLocaleLowerCase().includes(wanted))
  .sort((a,b)=>`${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
 const row=(p:OwnerPinStatus)=>{const name=`${p.firstName} ${p.lastName}`,base=`/app/employees/${encodeURIComponent(p.employeeId)}`;
  const action=!p.active?<Link className="b-btn b-btn--quiet ck-text" href={base} aria-label={t.openProfileFor(name)}>{t.viewProfile}</Link>
   :p.configured?<Link className="b-btn b-btn--quiet ck-text" href={`${base}/clocker-pin?from=pins`} aria-label={t.resetPinFor(name)}>{t.resetPin}</Link>
   :<Link className="b-btn b-btn--ghost" href={`${base}/clocker-pin?from=pins`} aria-label={t.setPinFor(name)}>{t.setPin}</Link>;
  return <BRow key={p.employeeId} lead={<BAvatar name={name}/>} title={name} sub={details[p.employeeId]||(p.active?p.configured?t.pinIsSet:t.pinNone:t.pinInactive)} trail={<span className="ck-acts">{action}</span>}/>;};
 // Phase 2 (Settings part 2, Nov 23, 2026): Direction B for real, as Team's people card. One card holds the search (an
 // outlined field), the kit's filter chips with their counts, and the people. Each count once: the chips carry them, so the
 // card has no "13 people need a PIN" heading over a "No PIN 13" chip.
 return <div className="ck-stack ck-pins c-pins">
  <p className="b-sr" role="status">{wanted?`${visible.length}`:''}</p>
  <BCard id="clocker-pins" label={t.pinsList}>
   <div className="ck-pins__tools">
    <label className="c-in c-pins__search"><span className="c-sr">{t.pinsSearch}</span><MagnifyingGlass weight="bold" className="c-ic" aria-hidden="true"/>
     <input type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" value={query} placeholder={t.pinsSearch} onChange={e=>setQuery(e.target.value)}/></label>
    <BFilters label={t.pinsFilter} items={filters.map(key=>({key,label:labels[key],count:count(key),current:filter===key,onSelect:()=>setFilter(key)}))}/>
   </div>
   {visible.length?<BList label={t.pinsList}>{visible.map(row)}</BList>
    :wanted
     ?<BState kind="empty" icon={<MagnifyingGlass weight="bold"/>} title={t.pinsNoMatch} line={t.pinsNoMatchBody}><button type="button" className="b-btn b-btn--ghost" onClick={()=>setQuery('')}>{t.pinsClearSearch}</button></BState>
     :<BState kind="empty" icon={<UsersThreeIcon weight="bold"/>} title={filter==='none'?t.pinsEmptyNone:filter==='set'?t.pinsEmptySet:t.pinsEmptyInactive} line={filter==='none'?t.pinsEmptyNoneBody:filter==='set'?t.pinsEmptySetBody:undefined}>
       {filter==='set'&&count('none')?<button type="button" className="b-btn b-btn--ghost" onClick={()=>setFilter('none')}>{t.pinsNeed(count('none'))}</button>:null}</BState>}
   <BNote>{t.pinsNote}</BNote>
  </BCard>
 </div>;
}

/** The page when the list of PINs could not be read: one state card, one retry. */
export function ClockerPinsUnavailable({lang='en'}:{lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang];
 return <div className="ck-stack"><BCard label={t.pinsLoadFailedTitle}><BState kind="failed" alert title={t.pinsLoadFailedTitle} line={t.pinsLoadFailedBody}>
  {/* eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript */}
  <a className="b-btn b-btn--teal" href="/app/settings/clocker/pins">{t.tryAgain}</a></BState></BCard></div>;
}
